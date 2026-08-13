/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * The evolvable cover art value used by the recording/release cover art
 * extensions.
 * 
 * CoverArt format changes over time (static-only → +animated → future formats).
 * Keeping it in an extension rather than immutable core means a new format is a
 * republish of this small package (or a brand-new cover art standard), not of the
 * frozen protocol. `CoverArt` references external storage via `ori::WalrusData`.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as walrus_data from '../0x340057f2174fb59e4626742dd2b46c662237837b6187450cb59e4976ce7eac78/walrus_data.js';
const $moduleName = 'cover_art::cover_art';
export const CoverArt = new MoveStruct({ name: `${$moduleName}::CoverArt`, fields: {
        still: walrus_data.WalrusData,
        animated: bcs.option(walrus_data.WalrusData)
    } });