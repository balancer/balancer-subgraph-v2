import json
from eth_keyfile import create_keyfile_json

# Nota Bene - the mnemonic below is *INSECURE* and shouldn't be used for real funds, only local development
#             it serves only to create deterministic accounts that can be shared with subgraph
# --mnemonic "album wire record stuff abandon mesh museum piece bean allow refuse below"

private_keys = [
        '275aa504f6c89a95a5a0742df03bf656e496538498986c318ee72c2d190fe77d',
        'b40b86ae581a44b6271e1e45e33f8abbe9dfbc70d0a554dc6016b6a8d219a020',
        'a06e815e0deb296cb642c8f9a100991901069c6628c947faa401c4f7e62598be',
        '12e45f92e43a3f4ccf0833eec04e3b501ef6e42b4580fd0547e35d7613244b53',
        'e8b39d975e470da4f3456b9eae9601b8edb45b550ba455f82565323f3030a2ae',
        'dd3fc9acd4d22887f4e9bf9a54ec2de489f828dc72cb3c641bce34cdffc9f123',
        'e08827e9221fc1e4b0043c198355fc9b24b8cb06880fad1c6ace965b90ea2933',
        'be00c68b194e32b1e7a39ba1b776220048a8513ba0fc95e869ceaa79b10d5ba1',
        '305594422b644c1aef1b4b27d7995852805a2c2d69e9a8805ab56ac85e041ba6',
        '32429c924f68a45e86510afa34b9af7def94c28d93606134642d9b26a86fd895 '
        ]

# private_keys = [b'dead', b'beef', b'cafe']
# Generate keys with empty passphrase
def generate_key_file(private_key):
    wallet = create_keyfile_json(bytearray.fromhex(private_key), b'test')
    address = wallet["address"]
    print(address)
    f = open("keys/dev/wallet." + address + ".json", "w")
    f.write(json.dumps(wallet))
    return wallet

result = map(generate_key_file, private_keys)
print(list(result))
