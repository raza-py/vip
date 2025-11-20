import vlessParserWasm from '../../src/rust/pkg/vless_parser_bg.wasm';
import { parse_vless_header, VlessHeader } from '../../src/rust/pkg/vless_parser';

let wasmInitialized = false;

async function initializeWasm() {
    if (!wasmInitialized) {
        // @ts-ignore
        await vlessParserWasm();
        wasmInitialized = true;
    }
}

export async function parseVlessHeaderWithWasm(buffer: Uint8Array): Promise<VlessHeader> {
    await initializeWasm();
    try {
        const result = parse_vless_header(buffer);
        // The wasm-bindgen will return a JS object that we can cast
        return result as unknown as VlessHeader;
    } catch (e) {
        console.error("Wasm parsing error:", e);
        throw new Error("Failed to parse VLESS header with Wasm");
    }
}
