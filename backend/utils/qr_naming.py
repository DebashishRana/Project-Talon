from typing import Dict, List

def generate_qr_name(metadata: Dict) -> str:
    """
    Generate a concise QR code name based on document type and numbers.
    Rules:
    - PAN & Aadhaar combo: adpn{aadhaar_last_2}{pan_last_2} (e.g. adpn1983)
    - Aadhaar single: ad{aadhaar_last_4} (e.g. ad2919)
    - PAN single: pn{pan_last_4} (e.g. pn9X2A)
    - Default: "doc" + short uuid or generic logic if numbers missing.
    """
    
    pan_numbers: List[str] = metadata.get("pan_numbers", [])
    aadhaar_numbers: List[str] = metadata.get("aadhaar_numbers", [])
    
    # Clean the numbers
    pan = pan_numbers[0].strip().replace(" ", "") if pan_numbers else ""
    aadhaar = aadhaar_numbers[0].strip().replace(" ", "") if aadhaar_numbers else ""
    
    has_pan = bool(pan and len(pan) >= 4)
    has_aadhaar = bool(aadhaar and len(aadhaar) >= 4)
    
    if has_aadhaar and has_pan:
        # Combo: adpn + aadhaar_last_2 + pan_last_2
        ad_last_2 = aadhaar[-2:]
        pn_last_2 = pan[-2:]
        return f"adpn{ad_last_2}{pn_last_2}"
        
    elif has_aadhaar:
        # Single Aadhaar: ad + aadhaar_last_4
        ad_last_4 = aadhaar[-4:]
        return f"ad{ad_last_4}"
        
    elif has_pan:
        # Single PAN: pn + pan_last_4
        pn_last_4 = pan[-4:]
        return f"pn{pn_last_4}"
        
    else:
        # Fallback if numbers aren't properly extracted
        return "doc_generic"
