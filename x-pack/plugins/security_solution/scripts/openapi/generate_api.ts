/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import Handlebars from '@kbn/handlebars';
import fs from 'fs/promises';
import type { OpenAPIV3 } from 'openapi-types';
import { resolve } from 'path';
import { ensureCleanFolder } from './ensure_clean_folder';
import { formatOutput } from './format_output';
import { registerHelpers } from './register_helpers';
import { registerTemplates } from './register_templates';

const ROOT_SECURITY_SOLUTION_FOLDER = resolve(__dirname, '../..');
const COMMON_API_FOLDER = resolve(__dirname, '../../common/api');
const API_CLIENT_FOLDER = resolve(__dirname, '../../public/api');

interface AdditionalProperties {
  /**
   * Whether or not the route and its schemas should be generated
   */
  'x-codegen-enabled'?: boolean;
  /**
   * Where to write the generated routes
   */
  implementationPath?: string;
  domain?: string;
  dependencies?: string[];
  authRequired?: boolean;
  generateImplementations?: boolean;
}

type OpenApiDocument = OpenAPIV3.Document<AdditionalProperties>;

(async () => {
  // Create a handlebars instance and register helpers and partials
  const handlebars = Handlebars.create();
  registerHelpers(handlebars);
  const templates = await registerTemplates(resolve(__dirname, './templates'), handlebars);

  // Handle the common schema
  const commonSchema = resolve(COMMON_API_FOLDER, './common_schema.yaml');
  const parsedCommonSchema = (await SwaggerParser.parse(commonSchema)) as OpenApiDocument;
  // Ensure the output directory exists and is empty
  await ensureCleanFolder(COMMON_API_FOLDER);
  // Write the parsed schema to a file for debugging
  await fs.writeFile(
    resolve(COMMON_API_FOLDER, './parsed_schema.json'),
    JSON.stringify(parsedCommonSchema)
  );
  // Generate common schema
  const commonSchemaResult = handlebars.compile(templates.common_schema)(parsedCommonSchema);
  await fs.writeFile(resolve(COMMON_API_FOLDER, './common_schema.gen.ts'), commonSchemaResult);
  const domainDirectories = (await fs.readdir(COMMON_API_FOLDER, { withFileTypes: true }))
    .filter((item) => item.isDirectory())
    .map((item) => item.name);
  const commonIndexResult = handlebars.compile(templates.index)({
    paths: [...domainDirectories, 'common_schema.gen'],
  });
  await fs.writeFile(resolve(COMMON_API_FOLDER, './index.ts'), commonIndexResult);

  // Format the output folder using prettier as the generator produces unformatted code
  formatOutput(COMMON_API_FOLDER);

  // eslint-disable-next-line @kbn/eslint/no_async_foreach
  domainDirectories.forEach(async (domain) => {
    const domainFolder = resolve(COMMON_API_FOLDER, domain);
    const domainSchema = resolve(domainFolder, 'domain_schema.yaml');
    const parsedDomainSchema = (await SwaggerParser.parse(domainSchema)) as OpenApiDocument;
    await ensureCleanFolder(domainFolder);
    await fs.writeFile(
      resolve(domainFolder, './parsed_schema.json'),
      JSON.stringify(parsedDomainSchema)
    );
    const domainSchemaResult = handlebars.compile(templates.domain_schema)(parsedDomainSchema);
    await fs.writeFile(
      resolve(domainFolder, './domain_schema.gen.ts'),
      removeUnusedImports(domainSchemaResult)
    );

    const routeDirectories = (await fs.readdir(domainFolder, { withFileTypes: true }))
      .filter((item) => item.isDirectory())
      .map((item) => item.name);

    const domainIndexResult = handlebars.compile(templates.index)({
      paths: [...routeDirectories.map((route) => `${route}/route_schema.gen`), 'domain_schema.gen'],
    });
    await fs.writeFile(resolve(domainFolder, './index.ts'), domainIndexResult);
    // Format the output folder using prettier as the generator produces unformatted code
    formatOutput(domainFolder);

    // eslint-disable-next-line @kbn/eslint/no_async_foreach
    routeDirectories.forEach(async (route) => {
      const routeFolder = resolve(domainFolder, route);
      const routeSchema = resolve(routeFolder, 'route_schema.yaml');
      const parsedRouteSchema = (await SwaggerParser.parse(routeSchema)) as OpenApiDocument;
      await ensureCleanFolder(routeFolder);
      await fs.writeFile(
        resolve(routeFolder, './parsed_schema.json'),
        JSON.stringify(parsedRouteSchema)
      );
      const schemaPath = `common/api/${domain}/${route}`;
      const apiOperations = getApiOperationsList(parsedRouteSchema, schemaPath);
      const routeSchemaResult = handlebars.compile(templates.route_schema)({
        apiOperations,
        parsedSchema: parsedRouteSchema,
      });
      await fs.writeFile(
        resolve(routeFolder, './route_schema.gen.ts'),
        removeUnusedImports(routeSchemaResult)
      );
      // Format the output folder using prettier as the generator produces unformatted code
      formatOutput(routeFolder);

      // Logic to generate API route stubs - currently disabled
      /* await Promise.all(
        apiOperations.map(async (apiOperation) => {
          if (apiOperation.generateImplementations) {
            // Generate API routes
            const routeName = snakeCase(apiOperation.operationId);
            const routeImplementationFolder = resolve(
              ROOT_SECURITY_SOLUTION_FOLDER,
              apiOperation.implementationPath
            );
            await ensureCleanFolder(routeImplementationFolder);
            const apiRouteResult = handlebars.compile(templates.api_route)(apiOperation);
            await fs.writeFile(
              resolve(routeImplementationFolder, `./${routeName}_route.gen.ts`),
              apiRouteResult
            );

            // Generate implementations for new routes
            const implPath = resolve(routeImplementationFolder, `./${routeName}_implementation.ts`);
            try {
              await fs.access(implPath);
            } catch (err) {
              // Generate the implementation file only if it doesn't exist; we don't
              // want to overwrite existing files
              if (err.code === 'ENOENT') {
                const apiImplementationResult = handlebars.compile(
                  templates.api_route_implementation
                )(apiOperation);
                await fs.writeFile(implPath, apiImplementationResult);
              } else {
                throw err;
              }
            }
            // Format the output folder using prettier as the generator produces unformatted code
            formatOutput(routeImplementationFolder);
          }
        })
      );*/

      // Generate API Client functions for operations in this route folder
      /* const apiClientFolder = resolve(API_CLIENT_FOLDER, domain, route);
      await ensureCleanFolder(apiClientFolder);
      const apiClientResult = handlebars.compile(templates.api_client)({ apiOperations });
      await fs.writeFile(resolve(apiClientFolder, './api_client.gen.ts'), apiClientResult);
      await formatOutput(apiClientFolder); */
    });
  });
})();

function removeUnusedImports(input: string) {
  let returnValue = input;
  if (!returnValue.includes('CommonSchema.')) {
    returnValue = returnValue.replace(/import \* as CommonSchema from [^;]+;/, '');
  }
  if (!returnValue.includes('DomainSchema.')) {
    returnValue = returnValue.replace(/import \* as DomainSchema from [^;]+;/, '');
  }
  return returnValue;
}

function getApiOperationsList(parsedSchema: OpenApiDocument, schemaPath: string) {
  return Object.entries(parsedSchema.paths).flatMap(([path, pathDescription]) => {
    return (['get', 'post', 'put', 'delete'] as const).flatMap((method) => {
      const operation = pathDescription?.[method];
      if (operation && operation['x-codegen-enabled'] !== false) {
        // Convert the query parameters to a schema object
        const params: Record<
          'query' | 'path',
          Required<Pick<OpenAPIV3.NonArraySchemaObject, 'properties' | 'type' | 'required'>>
        > = {
          query: {
            type: 'object',
            properties: {},
            required: [],
          },
          path: {
            type: 'object',
            properties: {},
            required: [],
          },
        };

        operation.parameters?.forEach((parameter) => {
          if ('name' in parameter && (parameter.in === 'query' || parameter.in === 'path')) {
            params[parameter.in].properties[parameter.name] = {
              ...parameter.schema,
              description: parameter.description,
            };

            if (parameter.required) {
              params[parameter.in].required.push(parameter.name);
            }
          }
        });

        if ('$ref' in operation.responses?.['200']) {
          throw new Error(
            `Cannot generate API client for ${method} ${path}: $ref in response is not supported`
          );
        }
        const response = operation.responses?.['200']?.content?.['application/json']?.schema;

        if (operation.requestBody && '$ref' in operation.requestBody) {
          throw new Error(
            `Cannot generate API client for ${method} ${path}: $ref in request body is not supported`
          );
        }
        const requestBody = operation.requestBody?.content?.['application/json']?.schema;

        const {
          operationId,
          description,
          tags,
          deprecated,
          dependencies,
          implementationPath,
          authRequired,
          generateImplementations,
        } = operation;
        if (!operationId) {
          throw new Error(`Missing operationId for ${method} ${path}`);
        }

        return {
          path,
          schemaPath,
          implementationPath,
          method,
          requestParams: Object.keys(params.path.properties).length ? params.path : undefined,
          requestQuery: Object.keys(params.query.properties).length ? params.query : undefined,
          requestBody,
          response,
          operationId,
          description,
          tags,
          deprecated,
          dependencies,
          authRequired,
          generateImplementations,
        };
      } else {
        return [];
      }
    });
  });
}
