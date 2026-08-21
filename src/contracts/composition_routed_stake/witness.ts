/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/** Canonical installation identity for the Composition routed-stake plugin. */

import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/composition_routed_stake::witness';
export const Witness = new MoveTuple({ name: `${$moduleName}::Witness`, fields: [bcs.bool()] });