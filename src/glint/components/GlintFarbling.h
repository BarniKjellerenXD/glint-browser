#ifndef GlintFarbling_h__
#define GlintFarbling_h__

#include "nsString.h"
#include "mozilla/Preferences.h"

namespace mozilla {
namespace glint {

class GlintFarbling {
public:
  static bool IsFarblingEnabled();
  static uint32_t GetHostHash(const nsACString& aHost);
  static uint32_t RandomizeValue(uint32_t aMin, uint32_t aMax, const nsACString& aHost);
  static void AddCanvasNoise(uint8_t* aData, uint32_t aWidth, uint32_t aHeight, const nsACString& aHost);
};

} // namespace glint
} // namespace mozilla

#endif
