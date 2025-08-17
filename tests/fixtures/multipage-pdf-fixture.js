// tests/fixtures/multipage-pdf-fixture.js

/**
 * This fixture simulates a 5-page PDF document that has been uploaded
 * and processed by the application. It includes the core PDF metadata
 * and a set of highlights distributed across different pages.
 *
 * This data is designed to be injected into the test environment's
 * IndexedDB to set up a consistent state for visual regression tests.
 */

// A consistent ID for the test PDF to ensure stable test runs.
const MULTIPAGE_PDF_ID = 'multipage-visual-test-pdf';

// Base64 encoded representation of a small, valid 5-page PDF file.
// This is a minimal but valid PDF that PDF.js can properly parse and render.
const MULTIPAGE_PDF_DATA_BASE64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUiA0IDAgUiA1IDAgUiA2IDAgUiA3IDAgUl0KL0NvdW50IDUKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgOCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgOSAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgMTAgMCBSCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDExIDAgUgo+PgplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyAxMiAwIFIKPj4KZW5kb2JqCjggMCBvYmoKPDwKL0xlbmd0aCAyMgo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFBhZ2UgMSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago5IDAgb2JqCjw8Ci9MZW5ndGggMjIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihQYWdlIDIpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL0xlbmd0aCAyMgo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFBhZ2UgMykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoxMSAwIG9iago8PAovTGVuZ3RoIDIyCj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooUGFnZSA0KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEyIDAgb2JqCjw8Ci9MZW5ndGggMjIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihQYWdlIDUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEzCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMjcgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMjgxIDAwMDAwIG4gCjAwMDAwMDAzNTggMDAwMDAgbiAKMDAwMDAwMDQzNSAwMDAwMCBuIAowMDAwMDAwNTEyIDAwMDAwIG4gCjAwMDAwMDA1ODQgMDAwMDAgbiAKMDAwMDAwMDY1NyAwMDAwMCBuIAowMDAwMDAwNzMwIDAwMDAwIG4gCjAwMDAwMDA4MDMgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMwovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKODc2CiUlRU9GCg==';

/**
 * Converts a Base64 string to a Blob object.
 * This is needed because IndexedDB stores file data as Blobs.
 * @param {string} b64Data - The Base64 encoded data.
 * @param {string} contentType - The MIME type of the content.
 * @returns {Blob} A Blob object representing the decoded data.
 */
function b64toBlob(b64Data, contentType = 'application/pdf') {
  const sliceSize = 512;
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

// The main fixture object for the multipage PDF.
const multipagePdfFixture = {
  id: MULTIPAGE_PDF_ID,
  name: 'Multipage Visual Test.pdf',
  // The actual file content is stored as a Blob.
  file: b64toBlob(MULTIPAGE_PDF_DATA_BASE64),
  // Metadata that the application uses.
  meta: {
    id: MULTIPAGE_PDF_ID,
    name: 'Multipage Visual Test.pdf',
    uploadedAt: new Date('2025-08-17T10:00:00Z').toISOString(),
    totalPages: 5,
  },
  // A collection of highlights associated with this PDF.
  // These will be pre-loaded into the 'highlights' object store.
  highlights: [
    // Page 1: A single green highlight.
    {
      id: 'highlight-page1-green',
      pdfId: MULTIPAGE_PDF_ID,
      pageNumber: 1,
      color: 'green',
      rect: { x1: 20, y1: 20, x2: 50, y2: 40 }, // Example coordinates
    },
    // Page 3: Multiple highlights of different colors.
    {
      id: 'highlight-page3-amber',
      pdfId: MULTIPAGE_PDF_ID,
      pageNumber: 3,
      color: 'amber',
      rect: { x1: 30, y1: 50, x2: 60, y2: 70 },
    },
    {
      id: 'highlight-page3-red',
      pdfId: MULTIPAGE_PDF_ID,
      pageNumber: 3,
      color: 'red',
      rect: { x1: 40, y1: 80, x2: 70, y2: 100 },
    },
    // Page 5: A highlight to test navigation to the last page.
    {
      id: 'highlight-page5-green',
      pdfId: MULTIPAGE_PDF_ID,
      pageNumber: 5,
      color: 'green',
      rect: { x1: 10, y1: 10, x2: 40, y2: 30 },
    },
  ],
};

// Export for use in test helpers.
// In a browser context, this would be attached to the window.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { multipagePdfFixture };
} else if (typeof window !== 'undefined') {
  window.multipagePdfFixture = multipagePdfFixture;
}
