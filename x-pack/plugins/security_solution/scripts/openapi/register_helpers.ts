/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Handlebars from '@kbn/handlebars';
import { snakeCase, camelCase } from 'lodash';

export function registerHelpers(handlebarsInstance: typeof Handlebars) {
  handlebarsInstance.registerHelper('concat', (...args) => {
    const values = args.slice(0, -1) as unknown[];
    return values.join('');
  });
  handlebarsInstance.registerHelper('parseRef', (refName: string) => {
    if (refName.includes('domain_schema.yaml')) {
      return 'DomainSchema.' + refName.split('/').pop();
    } else if (refName.includes('common_schema.yaml')) {
      return 'CommonSchema.' + refName.split('/').pop();
    }
    return refName.split('/').pop();
  });
  handlebarsInstance.registerHelper('snakeCase', snakeCase);
  handlebarsInstance.registerHelper('camelCase', camelCase);
  handlebarsInstance.registerHelper('toJSON', (value: unknown) => {
    return JSON.stringify(value);
  });
  handlebarsInstance.registerHelper('includes', (array: unknown, value: unknown) => {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.includes(value);
  });
  handlebarsInstance.registerHelper('or', (...args) => {
    // Last arguments is the handlebars context, so we ignore it
    return args.slice(0, -1).some((arg) => arg);
  });
  handlebarsInstance.registerHelper('eq', (a, b) => {
    return a === b;
  });
  handlebarsInstance.registerHelper('defined', (val) => {
    return val !== undefined;
  });
  handlebarsInstance.registerHelper('once', function (context, options) {
    var ret = '';
    var rendered = false;

    for (var i = 0, j = context.length; i < j; i++) {
      const newValue = options.fn(context[i]);
      if (!rendered && newValue != '') {
        ret = ret + newValue;
        rendered = true;
      }
    }

    return ret;
  });
}
