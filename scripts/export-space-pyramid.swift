import AppKit
let config = NSImage.SymbolConfiguration(pointSize: 64, weight: .medium)
guard let symbol = NSImage(systemSymbolName: "pyramid.fill", accessibilityDescription: nil)?.withSymbolConfiguration(config) else { fatalError("Missing pyramid.fill") }
let size = NSSize(width: 96, height: 96)
let image = NSImage(size: size, flipped: false) { bounds in
    symbol.draw(in: NSRect(x: 12, y: 12, width: 72, height: 72), from: .zero, operation: .sourceOver, fraction: 1)
    return true
}
guard let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Export failed") }
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
