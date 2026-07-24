import JsBarcode from "jsbarcode";

export function generateBarcodeSvg(value: string): string {
  const code = String(value ?? "").trim();
  if (!code) throw new Error("Código vazio.");

  const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svgNode, code, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
  });

  return new XMLSerializer().serializeToString(svgNode);
}
