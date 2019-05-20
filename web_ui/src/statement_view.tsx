import * as React from 'react';
import { Statement } from "./metadata";
import { localize } from './l10n';

export const StatementView = ({ statement }: { statement: Statement }) => (
    <React.Fragment>
        {statement.html && <iframe srcDoc={localize(statement.html)} sandbox="allow-scripts" />}
        {statement.pdf_base64 && <a download href={`data:application/pdf;base64,${localize(statement.pdf_base64)}`}>Download PDF</a>}
    </React.Fragment>
)
