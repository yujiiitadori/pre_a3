# pre_a3
A Chrome extension designed to make existing websites easier to navigate for visually impaired users.  VisionAssist enhances web accessibility by adding intelligent navigation, voice controls, high-contrast UI tools, and a distraction-free reader mode. It works on any website without requiring changes to the site’s code.
Here’s a polished **README.md** you can put directly in your GitHub repo.
It includes badges, screenshots placeholders, installation steps, usage guide, features, and future plans.


# VisionAssist

### *A Chrome extension that helps visually impaired users navigate any website with voice commands, smart reading, and high-visibility tools.*

---

## Installation

### **From Chrome Web Store (coming soon)**

Click “Add to Chrome” → Done.

### **Manual Installation (Developer Mode)**

1. Download or clone the repository
2. Open **chrome://extensions**
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the project folder

VisionAssist will now appear in your extensions toolbar.

---

## Features

### **Smart Screen Reader**

* Reads page content aloud
* Highlights text while reading
* Cleans clutter using “Reader Mode”
* Start/stop with keyboard shortcuts or buttons

### **Voice Command Navigation**

Hands-free webpage control:

* “Read headings”
* “Next section”
* “Read paragraph”
* “Stop”

Supports Indian and global TTS voices.

### **Semantic Heading Navigation**

* Detects real HTML headings (`<h1>`–`<h6>`)
* Skips fake headings (prices, ads, styled text)
* Lets users jump through page structure

### **High-Contrast Controls**

* Large Start and Stop buttons
* Low-vision–friendly color palette
* Simple shapes, sharp outlines
* Always visible, even over complicated pages

### **Keyboard Shortcuts**

* **Alt + R** → Start Reading
* **Alt + S** → Stop Reading
* **Alt + H** → Read All Headings

Custom shortcut configuration coming soon.

### Extras

* Image alt text extraction
* Adjustable reading speed
* Page focus mode
* Works with existing accessibility tools

---

## How It Works

VisionAssist scans the page DOM to identify:

* Headings and structure
* Content blocks
* Readable text
* Visual contrast elements

Then it provides:

1. Clean reading output
2. Voice command recognition
3. High-contrast UI overlays
4. A safe, non-invasive layer over any website

It requires **no modifications** to the website itself.

---

## Roadmap

* OCR for text inside images
* AI description of complex visuals
* Auto-detect “fake” headings more accurately
* Save custom profiles (font size, colors, voice)
* Mobile version
* Full offline mode

