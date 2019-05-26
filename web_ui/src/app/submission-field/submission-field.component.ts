import { Component, Input } from '@angular/core';
import { SubmissionFileField, SubmissionFileType } from 'src/metadata';

@Component({
  selector: 'app-submission-field',
  templateUrl: './submission-field.component.html',
  styleUrls: ['./submission-field.component.scss']
})
export class SubmissionFieldComponent {

  constructor() { }

  @Input()
  field!: SubmissionFileField;

  file: File | null = null;
  wantCustomTypes = false;

  isCompatible(type: SubmissionFileType) {
    return type.extensions.some(ext => this.file !== null && this.file.name.endsWith(ext));
  }

  get recommendedTypes() {
    return this.field.types.filter(t => this.isCompatible(t));
  }

  get notRecommendedTypes() {
    return this.field.types.filter(t => this.isCompatible(t));
  }

  get choices() {
    const recommendedTypes = this.field.types.filter(t => this.isCompatible(t));
    const otherTypes = this.field.types.filter(t => !this.isCompatible(t));

    return this.wantCustomTypes || recommendedTypes.length === 0 ? {
      type: 'custom',
      allTypes: [...recommendedTypes, ...otherTypes],
    } : recommendedTypes.length === 1 ? {
      type: 'oneRecommended',
      recommendedType: recommendedTypes[0],
    } : {
      type: 'manyRecommended',
      recommendedTypes,
    };
  }

  moreTypes() {
    this.wantCustomTypes = true;
  }

  changeFile(fileInput: HTMLInputElement) {
    this.file = fileInput.files && fileInput.files[0] || null;
  }

  typeTrackBy(type: SubmissionFileType) {
    return type.id;
  }
}
