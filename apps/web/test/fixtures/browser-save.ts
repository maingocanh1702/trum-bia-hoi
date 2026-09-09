// Browser-served fixture: use the production engine and IndexedDB writer in isolated tests.
export { Game, encodeSave, decodeSave } from '../../../../packages/engine/src';
export { BrowserSave, readBrowserSave } from '../../src/browser-save';
