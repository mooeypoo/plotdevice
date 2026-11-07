import { strToU8, zipSync, type Zippable } from 'fflate'

// Word manuscripts for the tests, written the way Word writes them: styles by id, `w:bidi` and `w:rtl`
// for Hebrew, footnotes.xml, comments.xml, tracked changes (`w:ins`, `w:del`), page breaks, pictures
// and tables (Milestone 23, from the Mammoth spike). Built in code, so they're readable and exact.

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'

export const run = (text: string, options: { rtl?: boolean; i?: boolean; b?: boolean } = {}): string => {
  const props = `${options.b ? '<w:b/><w:bCs/>' : ''}${options.i ? '<w:i/><w:iCs/>' : ''}${options.rtl ? '<w:rtl/>' : ''}`
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`
}
export const para = (runs: string, options: { style?: string; bidi?: boolean; center?: boolean; extra?: string } = {}): string => {
  const props = `${options.style ? `<w:pStyle w:val="${options.style}"/>` : ''}${options.bidi ? '<w:bidi/>' : ''}${options.center ? '<w:jc w:val="center"/>' : ''}${options.extra ?? ''}`
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs}</w:p>`
}
export const PAGE_BREAK = '<w:r><w:br w:type="page"/></w:r>'
export const footnoteRef = (id: number) =>
  `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`
export const numbered = (numId: number, level = 0) => `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`
export const PICTURE =
  '<w:r><w:drawing><wp:inline><wp:extent cx="9525" cy="9525"/><wp:docPr id="1" name="Picture 1" descr="A map of the island"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
export const TABLE = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
<w:style w:type="paragraph" w:styleId="10"><w:name w:val="heading 1"/></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>
<w:style w:type="paragraph" w:styleId="Part"><w:name w:val="Part"/><w:basedOn w:val="Heading1"/></w:style>
<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
</w:styles>`
const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NS}>
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="decimal"/><w:lvlText w:val="%2."/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`
// A one-pixel PNG.
const PNG = new Uint8Array(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a5d2b6e30000000049454e44ae426082'
    .match(/../g)
    ?.map((hex) => parseInt(hex, 16)) ?? [],
)

export interface DocxParts {
  body: string
  title?: string
  author?: string
  /** `<w:footnote>` elements, after the two separators Word always writes. */
  footnotes?: string
  /** `<w:comment>` elements. */
  comments?: string
}

/** A `.docx` file with this body, as Word would save it. */
export function docx({ body, title, author, footnotes, comments }: DocxParts): Uint8Array {
  const rels = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>',
  ]
  const files: Zippable = {}
  if (footnotes !== undefined) {
    rels.push(
      '<Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>',
    )
    files['word/footnotes.xml'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><w:footnotes ${NS}><w:footnote w:type="separator" w:id="-1"><w:p/></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p/></w:footnote>${footnotes}</w:footnotes>`,
    )
  }
  if (comments !== undefined) {
    rels.push(
      '<Relationship Id="rIdCm" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>',
    )
    files['word/comments.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:comments ${NS}>${comments}</w:comments>`)
  }
  const core =
    title === undefined && author === undefined
      ? {}
      : {
          'docProps/core.xml': strToU8(
            `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">${title === undefined ? '' : `<dc:title>${title}</dc:title>`}${author === undefined ? '' : `<dc:creator>${author}</dc:creator>`}</cp:coreProperties>`,
          ),
        }
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    ),
    'word/_rels/document.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`,
    ),
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr/></w:body></w:document>`,
    ),
    'word/styles.xml': strToU8(STYLES),
    'word/numbering.xml': strToU8(NUMBERING),
    'word/media/image1.png': PNG,
    ...core,
    ...files,
  })
}

/** The Hebrew manuscript from the spike: title page, parts, chapters, and everything that won't come in. */
export const HEBREW_BOOK = docx({
  title: 'מטע המלח',
  author: 'אינס ורגה',
  body: [
    para(run('מטע המלח', { rtl: true }), { style: 'Title', bidi: true }),
    para(run('מאת אינס ורגה', { rtl: true }), { bidi: true }),
    para(run('חלק ראשון: הגעה', { rtl: true }), { style: 'Heading1', bidi: true }),
    para(run('פרק 1: המעבר', { rtl: true }), { style: 'Heading2', bidi: true }),
    para(
      run('המעבורת יצאה לפני עלות השחר, ', { rtl: true }) +
        run('ו', { rtl: true, i: true }) +
        run('אינס לא הייתה עליה.', { rtl: true }) +
        footnoteRef(1),
      { bidi: true },
    ),
    para(run('נואל ענה: ', { rtl: true }) + run('It was never') + run(' ושתק.', { rtl: true }), { bidi: true }),
    para(run('The letter was sent in English.')),
    para(
      '<w:commentRangeStart w:id="0"/>' +
        run('היא לא חיכתה', { rtl: true }) +
        '<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r>' +
        '<w:ins w:id="5" w:author="Editor"><w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve"> לצהריים</w:t></w:r></w:ins>' +
        '<w:del w:id="6" w:author="Editor"><w:r><w:rPr><w:rtl/></w:rPr><w:delText> בכלל</w:delText></w:r></w:del>' +
        run('.', { rtl: true }),
      { bidi: true },
    ),
    para(run('* * *'), { center: true, bidi: true }),
    para(run('פריט ראשון', { rtl: true }), { style: 'ListParagraph', bidi: true, extra: numbered(1) }),
    para(run('פריט שני', { rtl: true }), { style: 'ListParagraph', bidi: true, extra: numbered(1) }),
    para(run('ציטוט מהמכתב.', { rtl: true }), { style: 'Quote', bidi: true }),
    TABLE,
    para(PICTURE),
    para(run('חלק שני: מלח', { rtl: true }), { style: 'Heading1', bidi: true }),
    para(run('פרק 2: רוח מלוחה', { rtl: true }), { style: 'Heading2', bidi: true }),
    para(run('הרוח באה מהים.', { rtl: true }) + footnoteRef(2), { bidi: true }),
  ].join(''),
  footnotes:
    '<w:footnote w:id="1"><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rtl/></w:rPr><w:t>בשנת 1904 המעבר ארך שעתיים.</w:t></w:r></w:p></w:footnote>' +
    '<w:footnote w:id="2"><w:p><w:r><w:t xml:space="preserve">A </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>second</w:t></w:r><w:r><w:t xml:space="preserve"> note.</w:t></w:r></w:p></w:footnote>',
  comments:
    '<w:comment w:id="0" w:author="Editor"><w:p><w:r><w:t>Cut this?</w:t></w:r></w:p></w:comment><w:comment w:id="1" w:author="Editor"><w:p><w:r><w:t>Unused.</w:t></w:r></w:p></w:comment>',
})

/** The English manuscript from the spike: no heading styles, "Chapter" lines and page breaks. */
export const ENGLISH_BOOK = docx({
  body: [
    para(run('THE SALT ORCHARD', { b: true }), { center: true }),
    para(run('by Ines Varga'), { center: true }),
    para(PAGE_BREAK),
    para(run('Chapter One', { b: true }), { center: true }),
    para(run('The Crossing', { b: true }), { center: true }),
    para(run('The ferry left before dawn, and ') + run('Ines', { i: true }) + run(' was not on it.')),
    para(run('#'), { center: true }),
    para(run('She did not wait for noon.')),
    para(PAGE_BREAK),
    para(run('Chapter Two', { b: true }), { center: true }),
    para(run('The salt had reached the first rows.')),
    para(run('Last line of chapter two.') + PAGE_BREAK),
    para(run('A page that starts with no heading at all.')),
  ].join(''),
})
