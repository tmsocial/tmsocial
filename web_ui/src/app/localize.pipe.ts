import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';
import { Localized } from 'src/l10n';
import { LocalizeService } from './localize.service';

@Pipe({
  name: 'localize'
})
export class LocalizePipe implements PipeTransform {
  constructor(
    private localize: LocalizeService
    ) { }

  transform<T>(value: Localized<T> | undefined): T | undefined {
    if (value === undefined) {
      return undefined;
    }

    return this.localize.localize(value);
  }

}
