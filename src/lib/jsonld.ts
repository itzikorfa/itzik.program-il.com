/** JSON for a <script type="application/ld+json"> block; `<` is escaped so content can't close the tag. */
export const jsonLdString = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');
