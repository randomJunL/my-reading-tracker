import {
  APP_DESCRIPTION,
  APP_NAME,
  applyDocumentBranding,
} from "@/config/branding";

describe("frontend branding", () => {
  it("applies the configured brand to document metadata", () => {
    document.head.innerHTML = '<meta name="description" content="old" />';

    applyDocumentBranding();

    expect(document.title).toBe(APP_NAME);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      APP_DESCRIPTION,
    );
  });
});
