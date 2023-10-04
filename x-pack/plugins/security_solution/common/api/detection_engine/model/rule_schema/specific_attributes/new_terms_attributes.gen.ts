/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 */

export type NewTermsFields = z.infer<typeof NewTermsFields>;
export const NewTermsFields = z.array(z.string()).min(1).max(3);

export type HistoryWindowStart = z.infer<typeof HistoryWindowStart>;
export const HistoryWindowStart = z.string().min(1);
