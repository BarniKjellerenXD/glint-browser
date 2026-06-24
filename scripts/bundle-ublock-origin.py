#!/usr/bin/env python3
"""Post-build script: download and bundle uBlock Origin into Glint's distribution."""

import urllib.request
import os
import sys
import shutil

def main():
    # Determine distribution extensions path
    # Surfer builds to engine/obj-*/dist/glint/
    obj_dir = None
    for root, dirs, files in os.walk(os.path.join(os.path.dirname(__file__), "..", "engine")):
        if root.endswith("dist") and "glint" in os.listdir(root) if os.path.isdir(root) else "":
            obj_dir = root
            break
    
    if not obj_dir:
        # Try common paths
        candidates = [
            os.path.join(os.path.dirname(__file__), "engine", "obj-x86_64-pc-windows-msvc", "dist", "glint"),
            os.path.join(os.path.dirname(__file__), "engine", "obj-x86_64-pc-mingw32", "dist", "glint"),
        ]
        for c in candidates:
            if os.path.isdir(c):
                obj_dir = c
                break
    
    if not obj_dir:
        print("Could not find build output directory. Skipping uBO bundling.")
        return 1
    
    ext_dir = os.path.join(obj_dir, "distribution", "extensions")
    os.makedirs(ext_dir, exist_ok=True)
    
    ubo_path = os.path.join(ext_dir, "uBlock0@raymondhill.net.xpi")
    
    if os.path.exists(ubo_path) and os.path.getsize(ubo_path) > 100000:
        print(f"uBlock Origin already bundled: {ubo_path}")
        return 0
    
    # Download uBlock Origin latest stable
    url = "https://github.com/gorhill/uBlock/releases/latest/download/uBlock0_1.63.2.firefox.signed.xpi"
    print(f"Downloading uBlock Origin from {url}...")
    try:
        urllib.request.urlretrieve(url, ubo_path)
        size = os.path.getsize(ubo_path)
        print(f"Downloaded uBlock Origin ({size} bytes) to {ubo_path}")
        return 0
    except Exception as e:
        print(f"Failed to download uBlock Origin: {e}")
        # Try alternative URL
        alt_url = "https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/addon-607454-latest.xpi"
        try:
            urllib.request.urlretrieve(alt_url, ubo_path)
            size = os.path.getsize(ubo_path)
            print(f"Downloaded uBlock Origin ({size} bytes) from AMO to {ubo_path}")
            return 0
        except Exception as e2:
            print(f"Also failed from AMO: {e2}")
            print("You can manually download uBlock Origin and place it at:")
            print(f"  {ubo_path}")
            return 1

if __name__ == "__main__":
    sys.exit(main())
