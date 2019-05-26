import { Pipe, PipeTransform } from '@angular/core';
import { ValueExpression } from 'src/evaluation-model';
import { EvaluationState } from 'src/evaluation-process';

@Pipe({
  name: 'evaluate'
})
export class EvaluatePipe implements PipeTransform {
  transform<T>(expr: ValueExpression<T>, state: EvaluationState | null): T | null {
    switch (expr.type) {
      case 'constant': {
        const { constant } = expr;
        return constant;
      }
      case 'ref': {
        const { ref } = expr;
        if (state !== null && ref in state.values) {
          return state.values[ref] as T;
        } else {
          return null;
        }
      }
    }
  }
}
