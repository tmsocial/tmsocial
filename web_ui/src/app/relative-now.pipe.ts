import { Pipe, PipeTransform, Inject, LOCALE_ID } from '@angular/core';
import { DateTime } from 'luxon';

@Pipe({
  name: 'relativeNow'
})
export class RelativeNowPipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private locale: string) { }

  transform(value: string): string {
    return DateTime.fromISO(value).setLocale(this.locale).toRelative();
  }

}
