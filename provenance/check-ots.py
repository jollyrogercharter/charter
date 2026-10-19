"""Verify an OpenTimestamps proof without a local Bitcoin node by comparing its commitments to block headers from two public explorers."""
import datetime, hashlib, json, sys, urllib.request
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation
from opentimestamps.core.serialize import StreamDeserializationContext
from opentimestamps.core.timestamp import DetachedTimestampFile

EXPLORERS = [("blockstream.info", "https://blockstream.info/api"), ("mempool.space", "https://mempool.space/api")]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "jrc-ots-check"}), timeout=20) as r:
        return r.read().decode()


def main(target, proof):
    with open(proof, "rb") as f:
        d = DetachedTimestampFile.deserialize(StreamDeserializationContext(f))
    if d.file_digest != hashlib.sha256(open(target, "rb").read()).digest():
        print("FAIL: file does not match the proof")
        return 1
    ok = False
    for msg, att in sorted(d.timestamp.all_attestations(), key=lambda x: getattr(x[1], "height", 0)):
        if not isinstance(att, BitcoinBlockHeaderAttestation):
            continue
        for name, base in EXPLORERS:
            block_hash = get(f"{base}/block-height/{att.height}").strip()
            block = json.loads(get(f"{base}/block/{block_hash}"))
            match = block["merkle_root"] == msg[::-1].hex()
            ok = ok or match
            when = datetime.datetime.fromtimestamp(block["timestamp"], datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            print(f"block {att.height} via {name}: {'MATCH' if match else 'MISMATCH'}, block time {when}")
    print("VERIFIED via public explorers (not a local node)" if ok else "NOT VERIFIED: no Bitcoin attestation matched")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
