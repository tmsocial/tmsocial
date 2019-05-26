import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { Localized } from 'src/l10n';

@Injectable({
  providedIn: 'root'
})
export class LocalizeService {
  constructor(@Inject(LOCALE_ID) private locale: string) { }

  localize<T>(value: Localized<T>): T {
    if ('default' in value) {
      return value.default;
    }

    return value[
      // use available locale which is next to current locale in lexicographical sort :)
      // FIXME: use a proper mechanism instead
      [this.locale, ...Object.keys(value)].sort().find(k => k in value) as string
    ];
  }
}
