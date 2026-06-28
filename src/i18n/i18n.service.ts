import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class I18nService {
  private translations: Record<string, Record<string, any>> = {};

  constructor() {
    const i18nPath = path.resolve(process.cwd(), 'i18n');
    if (!fs.existsSync(i18nPath)) return;
    const files = fs.readdirSync(i18nPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const lang = path.basename(file, '.json');
        const content = JSON.parse(fs.readFileSync(path.join(i18nPath, file), 'utf8'));
        this.translations[lang] = content;
      } catch (err) {
        // ignore invalid json
      }
    }
  }

  translate(key: string, lang = 'en', vars?: Record<string, string | number>): string {
    const parts = key.split('.');
    let obj: any = this.translations[lang] || this.translations['en'] || {};
    for (const p of parts) {
      if (obj && typeof obj === 'object' && p in obj) obj = obj[p];
      else return key;
    }
    let str = typeof obj === 'string' ? obj : String(obj);
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(vars[k]));
      }
    }
    return str;
  }
}
