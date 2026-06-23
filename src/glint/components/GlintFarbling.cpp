/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GlintFarbling.h"
#include "nsString.h"
#include "mozilla/Preferences.h"
#include "mozilla/Services.h"
#include "nsIObserverService.h"

namespace mozilla {
namespace glint {

static const char* kFarblingPref = "privacy.farbling.enabled";

bool GlintFarbling::IsFarblingEnabled() {
  static bool cached = false;
  static bool initialized = false;
  if (!initialized) {
    Preferences::AddBoolVarCache(&cached, kFarblingPref, false);
    initialized = true;
  }
  return cached;
}

uint32_t GlintFarbling::GetHostHash(const nsACString& aHost) {
  // FNV-1a hash for stable per-host randomization
  uint32_t hash = 2166136261u;
  const char* data = aHost.BeginReading();
  size_t len = aHost.Length();

  for (size_t i = 0; i < len; ++i) {
    hash ^= static_cast<uint8_t>(data[i]);
    hash *= 16777619u;
  }

  return hash;
}

uint32_t GlintFarbling::RandomizeValue(uint32_t aMin, uint32_t aMax,
                                        const nsACString& aHost) {
  if (aMin >= aMax) {
    return aMin;
  }

  uint32_t range = aMax - aMin + 1;
  uint32_t hash = GetHostHash(aHost);
  return aMin + (hash % range);
}

void GlintFarbling::AddCanvasNoise(uint8_t* aData, uint32_t aWidth,
                                    uint32_t aHeight) {
  if (!aData || aWidth == 0 || aHeight == 0) {
    return;
  }

  // Use host hash as seed for deterministic noise
  nsAutoCString host;
  // Note: Host must be retrieved from the document context before calling
  // GetHostHash(aHost) with an actual host. If host is empty, generate
  // a default seed.
  uint32_t seed = 0xDEADBEEF;

  // Select a random pixel based on the width/height dimensions
  uint32_t pixelOffset = (seed * aWidth) % (aWidth * aHeight);

  // Convert pixel offset to byte offset (4 bytes per pixel: RGBA)
  uint32_t byteOffset = pixelOffset * 4;

  // Ensure we don't go out of bounds
  if (byteOffset + 3 >= aWidth * aHeight * 4) {
    byteOffset = 0;
  }

  // Tweak each RGB channel by ±1
  for (int channel = 0; channel < 3; ++channel) {
    uint8_t* pixelChannel = aData + byteOffset + channel;
    int32_t delta = ((seed >> (channel * 8)) & 1) ? 1 : -1;
    int32_t newVal = static_cast<int32_t>(*pixelChannel) + delta;

    // Clamp to valid range [0, 255]
    if (newVal > 255) {
      newVal = 255;
    } else if (newVal < 0) {
      newVal = 0;
    }

    *pixelChannel = static_cast<uint8_t>(newVal);
  }
}

} // namespace glint
} // namespace mozilla
