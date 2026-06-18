"""Stage 0 company-data fetcher SEAM.

The user fills the actual fetch logic (MCP calls / Python). Until then, the UI
offers a manual 'paste input_data JSON' path so the whole pipeline is testable
end-to-end today.
"""


async def fetch_company_data(identifier: str, params: dict) -> dict:
    """
    identifier: e.g. a Finnish Y-tunnus or company name
    returns:    the FAKTAT input_data dict
    """
    raise NotImplementedError(
        "Käyttäjä täyttää: MCP/Python-haku tähän. "
        "Käytä toistaiseksi 'Liitä input_data JSON' -kenttää Stage 0:ssa."
    )
