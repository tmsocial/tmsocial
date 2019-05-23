import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';
import { Localized } from 'src/l10n';

@Pipe({
  name: 'localize'
})
export class LocalizePipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private locale: string) { }

  transform<T>(value: Localized<T> | undefined): T | undefined {
    if (value === undefined) {
      return undefined;
    }

    if ('default' in value) {
      return value.default;
    }

    return value[
      // use available locale which is next to current locale in lexicographical sort :)
      // FIXME: use a proper mechanism instead
      [this.locale, ...Object.keys(value)].sort().find(k => k in value)
    ];
  }

}
