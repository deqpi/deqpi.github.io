import { UIHandler } from './ui-handler.js';
import { Converter_1_3_0_to_1_4_0 } from './converters/converter-1.3.0-to-1.4.0.js';

const converters = {
  '1.3.0_to_1.4.0': Converter_1_3_0_to_1_4_0,
};

const ui = new UIHandler();

ui.onConvert(async (files, folderName, fromVersion, toVersion) => {
  const converterKey = `${fromVersion}_to_${toVersion}`;
  const ConverterClass = converters[converterKey];
  
  if (!ConverterClass) {
    throw new Error(`No converter found for ${fromVersion} to ${toVersion}`);
  }
  
  const converter = new ConverterClass();
  await converter.convert(files, folderName);
});