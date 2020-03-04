/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { AlertEvent, EndpointEvent, EndpointMetadata, OSFields } from './types';

export type Event = AlertEvent | EndpointEvent;

interface EventOptions {
  timestamp: number;
  entityID?: string;
  parentEntityID?: string;
  eventType?: string;
  eventCategory?: string;
}

const Windows: OSFields[] = [
  {
    name: 'windows 10.0',
    full: 'Windows 10',
    version: '10.0',
    variant: 'Windows Pro',
  },
  {
    name: 'windows 10.0',
    full: 'Windows Server 2016',
    version: '10.0',
    variant: 'Windows Server',
  },
  {
    name: 'windows 6.2',
    full: 'Windows Server 2012',
    version: '6.2',
    variant: 'Windows Server',
  },
  {
    name: 'windows 6.3',
    full: 'Windows Server 2012R2',
    version: '6.3',
    variant: 'Windows Server Release 2',
  },
];

const Linux: OSFields[] = [];

const Mac: OSFields[] = [];

const OS: OSFields[] = [...Windows, ...Mac, ...Linux];

const POLICIES: Array<{ name: string; id: string }> = [
  // mapping name and ID as a sperate attribute makes query more complicated
  // perhaps, combine them into a single field such that
  // policy.namd_id = 'Default:C2A9093E-E289-4C0A-AA44-8C32A414FA7A'
  {
    name: 'Default',
    id: '00000000-0000-0000-0000-000000000000',
  },
  {
    name: 'With Eventing',
    id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
  },
];

const FILE_OPERATIONS: string[] = ['creation', 'open', 'rename', 'execution', 'deletion'];

// These are from the v1 schemas and aren't all valid ECS event categories, still in flux
const OTHER_EVENT_CATEGORIES: string[] = ['driver', 'file', 'library', 'network', 'registry'];

function randomN(n: number): number {
  return Math.floor(Math.random() * n);
}

function* randomNGenerator(max: number, count: number) {
  while (count > 0) {
    yield randomN(max);
    count--;
  }
}

function randomArray<T>(lenghtLimit: number, generator: () => T): T[] {
  const rand = randomN(lenghtLimit) + 1;
  return [...Array(rand).keys()].map(generator);
}

function randomMac(): string {
  return [...randomNGenerator(255, 6)].map(x => x.toString(16)).join('-');
}

function randomIP(): string {
  return [10, ...randomNGenerator(255, 3)].map(x => x.toString()).join('.');
}

function randomVersion(): string {
  return [6, ...randomNGenerator(10, 2)].map(x => x.toString()).join('.');
}

function randomChoice<T>(arg: T[]): T {
  return arg[randomN(arg.length)];
}

function randomString(length: number): string {
  return [...randomNGenerator(36, length)].map(x => x.toString(36)).join('');
}

function randomHostname(): string {
  return `Host-${randomString(10)}`;
}

export class EndpointDocGenerator {
  agentId: string;
  hostId: string;
  hostname: string;
  lastDHCPLeaseAt: number;
  macAddress: string[];
  ip: string[];
  agentVersion: string;
  os: OSFields;
  policy: { name: string; id: string };

  constructor() {
    this.hostId = uuid.v4();
    this.agentId = uuid.v4();
    this.hostname = randomHostname();
    this.lastDHCPLeaseAt = new Date().getTime();
    this.ip = randomArray(3, () => randomIP());
    this.macAddress = randomArray(3, () => randomMac());
    this.agentVersion = randomVersion();
    this.os = randomChoice(OS);
    this.policy = randomChoice(POLICIES);
  }

  public generateEndpointMetadata(ts: number): EndpointMetadata {
    // If we generate metadata with a timestamp at least 12 hours after the last generated doc,
    // change the IPs for the host
    if (Math.abs(ts - this.lastDHCPLeaseAt) > 3600 * 12 * 1000) {
      this.lastDHCPLeaseAt = ts;
      this.ip = randomArray(3, () => randomIP());
    }
    return {
      '@timestamp': ts,
      event: {
        created: ts,
      },
      endpoint: {
        policy: {
          id: this.policy.id,
        },
      },
      agent: {
        version: this.agentVersion,
        id: this.agentId,
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
    };
  }

  public generateAlert(ts: number, entityID?: string, parentEntityID?: string): AlertEvent {
    return {
      '@timestamp': ts,
      agent: {
        id: this.agentId,
        version: this.agentVersion,
      },
      event: {
        action: randomChoice(FILE_OPERATIONS),
        kind: 'alert',
        category: 'malware',
        id: uuid.v4(),
        dataset: 'endpoint',
        module: 'endpoint',
        type: 'creation',
      },
      endpoint: {
        policy: {
          id: this.policy.id,
        },
      },
      file: {
        owner: 'SYSTEM',
        name: 'fake_malware.exe',
        path: 'C:/fake_malware.exe',
        accessed: ts,
        mtime: ts,
        created: ts,
        size: 3456,
        hash: {
          md5: 'fake file md5',
          sha1: 'fake file sha1',
          sha256: 'fake file sha256',
        },
        code_signature: {
          trusted: false,
          subject_name: 'bad signer',
        },
        malware_classifier: {
          identifier: 'endpointpe',
          score: 1,
          threshold: 0.66,
          version: '3.0.33',
        },
        temp_file_path: 'C:/temp/fake_malware.exe',
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
      process: {
        pid: 2,
        name: 'malware writer',
        start: ts,
        uptime: 0,
        user: 'SYSTEM',
        entity_id: entityID ? entityID : randomString(10),
        parent: parentEntityID ? { entity_id: parentEntityID, pid: 1 } : undefined,
        token: {
          domain: 'NT AUTHORITY',
          integrity_level: 16384,
          integrity_level_name: 'system',
          privileges: [
            {
              description: 'Replace a process level token',
              enabled: false,
              name: 'SeAssignPrimaryTokenPrivilege',
            },
          ],
          sid: 'S-1-5-18',
          type: 'tokenPrimary',
          user: 'SYSTEM',
        },
        code_signature: {
          trusted: false,
          subject_name: 'bad signer',
        },
        hash: {
          md5: 'fake md5',
          sha1: 'fake sha1',
          sha256: 'fake sha256',
        },
      },
      dll: [
        {
          pe: {
            architecture: 'x64',
            imphash: 'c30d230b81c734e82e86e2e2fe01cd01',
          },
          code_signature: {
            subject_name: 'Cybereason Inc',
            trusted: true,
          },
          compile_time: 1534424710,
          hash: {
            md5: '1f2d082566b0fc5f2c238a5180db7451',
            sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
            sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
          },
          malware_classifier: {
            identifier: 'Whitelisted',
            score: 0,
            threshold: 0,
            version: '3.0.0',
          },
          mapped_address: 5362483200,
          mapped_size: 0,
          path: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
        },
      ],
    };
  }

  public generateEvent(options: EventOptions): EndpointEvent {
    return {
      '@timestamp': options.timestamp,
      agent: {
        id: this.agentId,
        version: this.agentVersion,
        type: 'endpoint',
      },
      ecs: {
        version: '1.4.0',
      },
      event: {
        category: options.eventCategory ? options.eventCategory : 'process',
        kind: 'event',
        type: options.eventType ? options.eventType : 'creation',
        id: uuid.v4(),
      },
      host: {
        id: this.hostId,
        hostname: this.hostname,
        ip: this.ip,
        mac: this.macAddress,
        os: this.os,
      },
      process: {
        entity_id: options.entityID ? options.entityID : randomString(10),
        parent: options.parentEntityID ? { entity_id: options.parentEntityID } : undefined,
      },
    };
  }

  public generateFullResolverTree(
    alertAncestors?: number,
    childGenerations?: number,
    maxChildrenPerNode?: number,
    relatedEventsPerNode?: number,
    percentNodesWithRelated?: number,
    percentChildrenTerminated?: number
  ): Event[] {
    const ancestry = this.generateAlertEventAncestry(alertAncestors);
    // ancestry will always have at least 2 elements, and the second to last element will be the process associated with the alert
    const descendants = this.generateDescendantsTree(
      ancestry[ancestry.length - 2],
      childGenerations,
      maxChildrenPerNode,
      relatedEventsPerNode,
      percentNodesWithRelated,
      percentChildrenTerminated
    );
    return ancestry.concat(descendants);
  }

  public generateAlertEventAncestry(alertAncestors = 3): Event[] {
    const events = [];
    const startDate = new Date().getTime();
    const root = this.generateEvent({ timestamp: startDate + 1000 });
    events.push(root);
    let ancestor = root;
    for (let i = 0; i < alertAncestors; i++) {
      ancestor = this.generateEvent({
        timestamp: startDate + 1000 * (i + 1),
        parentEntityID: ancestor.process.entity_id,
      });
      events.push(ancestor);
    }
    events.push(
      this.generateAlert(
        startDate + 1000 * alertAncestors,
        ancestor.process.entity_id,
        ancestor.process.parent?.entity_id
      )
    );
    return events;
  }

  public generateDescendantsTree(
    root: Event,
    generations = 2,
    maxChildrenPerNode = 2,
    relatedEventsPerNode = 3,
    percentNodesWithRelated = 100,
    percentChildrenTerminated = 100
  ): Event[] {
    let events: Event[] = [root];
    let parents = [root];
    let timestamp = root['@timestamp'];
    for (let i = 0; i < generations; i++) {
      const newParents: EndpointEvent[] = [];
      parents.forEach(element => {
        // const numChildren = randomN(maxChildrenPerNode);
        const numChildren = maxChildrenPerNode;
        for (let j = 0; j < numChildren; j++) {
          timestamp = timestamp + 1000;
          const child = this.generateEvent({
            timestamp,
            parentEntityID: element.process.entity_id,
          });
          newParents.push(child);
        }
      });
      events = events.concat(newParents);
      parents = newParents;
    }
    const terminationEvents: EndpointEvent[] = [];
    let relatedEvents: EndpointEvent[] = [];
    events.forEach(element => {
      if (randomN(100) < percentChildrenTerminated) {
        timestamp = timestamp + 1000;
        terminationEvents.push(
          this.generateEvent({
            timestamp,
            entityID: element.process.entity_id,
            parentEntityID: element.process.parent?.entity_id,
            eventCategory: 'process',
            eventType: 'end',
          })
        );
      }
      if (randomN(100) < percentNodesWithRelated) {
        relatedEvents = relatedEvents.concat(
          this.generateRelatedEvents(element, relatedEventsPerNode)
        );
      }
    });
    events = events.concat(terminationEvents);
    events = events.concat(relatedEvents);
    return events;
  }

  public generateRelatedEvents(node: Event, numRelatedEvents = 10): EndpointEvent[] {
    const ts = node['@timestamp'] + 1000;
    const relatedEvents: EndpointEvent[] = [];
    for (let i = 0; i < numRelatedEvents; i++) {
      relatedEvents.push(
        this.generateEvent({
          timestamp: ts,
          entityID: node.process.entity_id,
          parentEntityID: node.process.parent?.entity_id,
          eventCategory: randomChoice(OTHER_EVENT_CATEGORIES),
        })
      );
    }
    return relatedEvents;
  }
}
