# Sound Files for Doodle Diver

This game requires 7 sound files to be placed in the `public/` directory. All files should be in MP3 format.

## Required Files

### 1. `bg-music.mp3` - Background Music (Looping)
**Description:** 16-bit style water level music inspired by early Zelda games
**Recommendations:**
- Use [BeepBox](https://beepbox.co) or [FamiStudio](https://famistudio.org) to create custom chiptune music
- Search on [OpenGameArt.org](https://opengameart.org) for "water music" or "underwater music" with CC0 or CC-BY license
- Try [Pixabay](https://pixabay.com/music) "8-bit water" or "chiptune underwater"
- Suggested keywords: "8-bit underwater", "chiptune ocean", "retro water level"

### 2. `mask-ping.mp3` - Mask Pickup Sound
**Description:** Pleasant "ping" or chime sound for collecting masks
**Recommendations:**
- Use [jsfxr](https://sfxr.me) - Set to "Pickup/Coin" preset
- Search [Freesound.org](https://freesound.org) for "chime pickup" or "coin collect"
- Try "positive chime" or "power up ping" on [Mixkit](https://mixkit.co/free-sound-effects/game/)

### 3. `oxygen-pop.mp3` - Oxygen Tank Pickup Sound
**Description:** Satisfying "pop" or "bubble" sound for oxygen collection
**Recommendations:**
- Use [jsfxr](https://sfxr.me) - Set to "Powerup" preset
- Search [Freesound.org](https://freesound.org) for "bubble pop" or "oxygen refill"
- Try "bubble burst" or "air release" sounds

### 4. `mine-explosion.mp3` - Mine Collision Sound
**Description:** Small explosion or impact sound
**Recommendations:**
- Use [jsfxr](https://sfxr.me) - Set to "Explosion" preset
- Search [Freesound.org](https://freesound.org) for "small explosion" or "8-bit explosion"
- Try "retro bomb" or "pixel explosion"

### 5. `hazard-thud.mp3` - Rock/Fish Collision Sound
**Description:** Dull thud or impact sound for rocks and fish
**Recommendations:**
- Use [jsfxr](https://sfxr.me) - Set to "Hit/Hurt" preset
- Search [Freesound.org](https://freesound.org) for "dull impact" or "body hit"
- Try "soft thud" or "bump sound"

### 6. `jellyfish-squish.mp3` - Jellyfish Collision Sound
**Description:** Wet squish or squelch sound
**Recommendations:**
- Search [Freesound.org](https://freesound.org) for "squish" or "squelch"
- Try "wet impact" or "slime sound"
- Use [jsfxr](https://sfxr.me) with custom settings (low frequency, short duration)

### 7. `game-over.mp3` - Game Over Sound
**Description:** Arcade-style game over jingle (like Pac-Man)
**Recommendations:**
- Search [Freesound.org](https://freesound.org) for "arcade game over" or "retro defeat"
- Try [OpenGameArt.org](https://opengameart.org) for "game over jingle"
- Use [BeepBox](https://beepbox.co) to create a simple descending jingle

## Quick Start Guide

### Option 1: Free Sound Libraries (Fastest)
1. Visit [Mixkit Game Sounds](https://mixkit.co/free-sound-effects/game/) - Download retro/arcade sounds
2. Visit [OpenGameArt.org](https://opengameart.org) - Filter by "Sound Effect" and "CC0" license
3. Visit [Freesound.org](https://freesound.org) - Create free account and search for sounds
4. Rename downloaded files to match the required filenames above
5. Convert to MP3 if needed using [CloudConvert](https://cloudconvert.com/wav-to-mp3)

### Option 2: Generate Sounds (Most Authentic)
1. Open [jsfxr](https://sfxr.me) in your browser
2. For each sound effect, select the appropriate preset (Pickup, Explosion, Hit, etc.)
3. Click "Export .wav" and convert to MP3
4. For background music, use [BeepBox](https://beepbox.co) to create a looping underwater track

### Option 3: Pre-Made Sound Packs
Search for "retro game sound pack" or "8-bit sound effects pack" on:
- [Itch.io](https://itch.io/game-assets/free/tag-sound-effects)
- [OpenGameArt.org](https://opengameart.org)
- [Kenney.nl](https://kenney.nl/assets?q=audio) (all CC0)

## Installation
Once you have all 7 MP3 files, place them in the `public/` directory of this project:
```
public/
  bg-music.mp3
  mask-ping.mp3
  oxygen-pop.mp3
  mine-explosion.mp3
  hazard-thud.mp3
  jellyfish-squish.mp3
  game-over.mp3
```

## License Compliance
Make sure any sounds you use are:
- CC0 (Public Domain) - No attribution required
- CC-BY - Attribution required (add to game credits)
- Personal/Commercial use allowed
- Check individual sound licenses before using
