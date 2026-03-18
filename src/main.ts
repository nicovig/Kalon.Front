import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { App } from './app/app';
import { appConfig } from './app/app.config';

registerLocaleData(localeFr);

bootstrapApplication(App, appConfig).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});
