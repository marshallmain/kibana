/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { Client, errors } from '@elastic/elasticsearch';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import { ToolingLog, CA_CERT_PATH } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
  LIST_ITEM_URL,
  LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { AxiosResponse } from 'axios';

main();

async function deleteIndices(indices: string[], client: Client) {
  const handleErr = (err: unknown) => {
    if (err instanceof errors.ResponseError && err.statusCode !== 404) {
      console.log(JSON.stringify(err, null, 2));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  };

  for (const index of indices) {
    try {
      // The index could be a data stream so let's try deleting that first
      // The ES client in Kibana doesn't support data streams yet so we need to make a raw request to the ES route
      await client.transport.request({ method: 'DELETE', path: `_data_stream/${index}` });
    } catch (err) {
      handleErr(err);
    }
  }
}

const VALUE_LISTS_FOLDER = 'value_lists';
const EXCEPTION_LISTS_FOLDER = 'exception_lists';
const SOURCE_DATA_FOLDER = 'source_data';
const RULES_FOLDER = 'rules';

async function loadScenarioData(kbnClient: KbnClient, scenarioPath: string) {
  // TODO: what happens if there is no folder?
  // First, load the value lists
  const valueLists = fs.readdirSync(path.join(scenarioPath, VALUE_LISTS_FOLDER));
  for (const valueList of valueLists) {
    const valueListPath = path.join(scenarioPath, VALUE_LISTS_FOLDER, valueList);
    const config = JSON.parse(fs.readFileSync(path.join(valueListPath, 'config.json')).toString());
    const createListResponse = await kbnClient.request({
      path: LIST_URL,
      method: 'POST',
      body: config,
    });

    const listItems = fs.readFileSync(path.join(valueListPath, 'list.txt'));
    const importListItemsResponse = await kbnClient.request({
      path: `${LIST_ITEM_URL}/_import`,
      method: 'POST',
      body: listItems,
    });
  }

  // Next, load exception lists that might reference the value lists
  const exceptionLists = fs.readdirSync(path.join(scenarioPath, EXCEPTION_LISTS_FOLDER));
  for (const exceptionList of exceptionLists) {
    const exceptionListPath = path.join(scenarioPath, VALUE_LISTS_FOLDER, exceptionList);
    const config = JSON.parse(
      fs.readFileSync(path.join(exceptionListPath, 'config.json')).toString()
    );
    const createExceptionListResponse = (await kbnClient.request({
      path: EXCEPTION_LIST_URL,
      method: 'POST',
      body: config,
    })) as AxiosResponse<ExceptionListSchema>;

    const exceptionListItems = JSON.parse(
      fs.readFileSync(path.join(exceptionListPath, 'items.json')).toString()
    );
    for (const exceptionListItem of exceptionListItems) {
      const createExceptionListItemResponse = await kbnClient.request({
        path: EXCEPTION_LIST_ITEM_URL,
        method: 'POST',
        body: {
          ...exceptionListItem,
          list_id: createExceptionListResponse.data.list_id,
        },
      });
    }
  }

  // Finally, load rules that can reference the exception list(s)
  const rules = fs.readdirSync(path.join(scenarioPath, RULES_FOLDER));
}

async function main() {
  const argv = yargs.help().options({
    node: {
      alias: 'n',
      describe: 'elasticsearch node url',
      default: 'http://elastic:changeme@localhost:9200',
      type: 'string',
    },
    kibana: {
      alias: 'k',
      describe: 'kibana url',
      default: 'http://elastic:changeme@localhost:5601',
      type: 'string',
    },
    ssl: {
      alias: 'ssl',
      describe: 'Use https for elasticsearch and kbn clients',
      type: 'boolean',
      default: false,
    },
  }).argv;
  let ca: Buffer;
  let kbnClient: KbnClient;
  let clientOptions: ClientOptions;

  if (argv.ssl) {
    ca = fs.readFileSync(CA_CERT_PATH);
    const url = argv.kibana.replace('http:', 'https:');
    const node = argv.node.replace('http:', 'https:');
    kbnClient = new KbnClient({
      log: new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      }),
      url,
      certificateAuthorities: [ca],
    });
    clientOptions = { node, tls: { ca: [ca] } };
  } else {
    kbnClient = new KbnClient({
      log: new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      }),
      url: argv.kibana,
    });
    clientOptions = { node: argv.node };
  }
  const client = new Client(clientOptions);

  if (argv.delete) {
    await deleteIndices(
      [argv.eventIndex, argv.metadataIndex, argv.policyIndex, argv.alertIndex],
      client
    );
  }

  let seed = argv.seed;
  if (!seed) {
    seed = Math.random().toString();
    console.log(`No seed supplied, using random seed: ${seed}`);
  }
  const startTime = new Date().getTime();
  await indexHostsAndAlerts(
    client,
    kbnClient,
    seed,
    argv.numHosts,
    argv.numDocs,
    argv.metadataIndex,
    argv.policyIndex,
    argv.eventIndex,
    argv.alertIndex,
    argv.alertsPerHost,
    argv.fleet,
    argv.logsEndpoint,
    {
      ancestors: argv.ancestors,
      generations: argv.generations,
      children: argv.children,
      relatedEvents: argv.relatedEvents,
      relatedAlerts: argv.relatedAlerts,
      percentWithRelated: argv.percentWithRelated,
      percentTerminated: argv.percentTerminated,
      alwaysGenMaxChildrenPerNode: argv.maxChildrenPerNode,
      ancestryArraySize: argv.ancestryArraySize,
      eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(argv.eventIndex),
      alertsDataStream: EndpointDocGenerator.createDataStreamFromIndex(argv.alertIndex),
    }
  );
  console.log(`Creating and indexing documents took: ${new Date().getTime() - startTime}ms`);
}
