/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/** Canonical installation identity for the release revenue distributor. */

import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/release_revenue_distributor::witness';
export const Witness = new MoveTuple({ name: `${$moduleName}::Witness`, fields: [bcs.bool()] });