use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum AddressType {
    IPv4 = 1,
    Domain = 2,
    IPv6 = 3,
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Serialize, Deserialize, Debug)]
pub struct VlessHeader {
    pub version: u8,
    pub uuid: String,
    pub command: u8, // 1 for TCP, 2 for UDP
    pub port: u16,
    pub address_type: AddressType,
    pub address: String,
    pub raw_data_index: usize,
}


#[wasm_bindgen]
pub fn parse_vless_header(buffer: &[u8]) -> Result<JsValue, JsValue> {
    if buffer.len() < 24 {
        return Err(JsValue::from_str("Invalid VLESS header: buffer too short"));
    }

    let version = buffer[0];
    
    // Extract UUID
    let uuid_bytes: [u8; 16] = buffer[1..17].try_into().map_err(|_|
        JsValue::from_str("Invalid UUID slice")
    )?;
    let uuid = Uuid::from_bytes(uuid_bytes).to_string();
    
    // The VLESS protocol format specifies addons after the UUID. We skip them for now.
    let addons_len = buffer[17];
    let mut cursor = 18 + addons_len as usize;

    if buffer.len() <= cursor {
        return Err(JsValue::from_str("Invalid VLESS header: missing command byte"));
    }
    
    let command = buffer[cursor];
    cursor += 1;

    if buffer.len() < cursor + 2 {
        return Err(JsValue::from_str("Invalid VLESS header: missing port bytes"));
    }
    let port = u16::from_be_bytes([buffer[cursor], buffer[cursor + 1]]);
    cursor += 2;

    if buffer.len() <= cursor {
        return Err(JsValue::from_str("Invalid VLESS header: missing address type"));
    }

    let address_type_byte = buffer[cursor];
    cursor += 1;

    let (address, address_len) = match address_type_byte {
        1 => { // IPv4
            if buffer.len() < cursor + 4 {
                return Err(JsValue::from_str("Invalid VLESS header: incomplete IPv4 address"));
            }
            let addr_bytes = &buffer[cursor..cursor + 4];
            (format!("{}.{}.{}.{}", addr_bytes[0], addr_bytes[1], addr_bytes[2], addr_bytes[3]), 4)
        },
        2 => { // Domain
            if buffer.len() <= cursor {
                return Err(JsValue::from_str("Invalid VLESS header: missing domain length"));
            }
            let domain_len = buffer[cursor] as usize;
            cursor += 1;
            if buffer.len() < cursor + domain_len {
                return Err(JsValue::from_str("Invalid VLESS header: incomplete domain name"));
            }
            let domain = String::from_utf8_lossy(&buffer[cursor..cursor + domain_len]).to_string();
            (domain, domain_len)
        },
        3 => { // IPv6
            if buffer.len() < cursor + 16 {
                return Err(JsValue::from_str("Invalid VLESS header: incomplete IPv6 address"));
            }
            let addr_bytes = &buffer[cursor..cursor + 16];
            let mut segments = [0u16; 8];
            for i in 0..8 {
                segments[i] = u16::from_be_bytes([addr_bytes[i*2], addr_bytes[i*2+1]]);
            }
            let ipv6 = std::net::Ipv6Addr::new(
                segments[0], segments[1], segments[2], segments[3], 
                segments[4], segments[5], segments[6], segments[7]
            );
            (ipv6.to_string(), 16)
        },
        _ => return Err(JsValue::from_str(&format!("Unsupported address type: {}", address_type_byte)))
    };
    
    let address_type = match address_type_byte {
        1 => AddressType::IPv4,
        2 => AddressType::Domain,
        3 => AddressType::IPv6,
        _ => unreachable!(),
    };
    
    let header = VlessHeader {
        version,
        uuid,
        command,
        port,
        address_type,
        address,
        raw_data_index: cursor + address_len,
    };

    serde_wasm_bindgen::to_value(&header).map_err(|e| JsValue::from_str(&e.to_string()))
}
