# Ayansh's Computer World

An animated, hands-on web app that shows a 7-year-old (Class 2) how a computer works, one building block at a time.

**To play:** download `index.html` and double-click it. It opens in any web browser (Chrome works best).
Nothing to install. It works offline too; you only need the internet for the nicer fonts.

## The 8 levels

| Level | What Ayansh does | What he learns |
|---|---|---|
| 1. Meet the Computer | Taps the monitor, CPU box, keyboard, mouse, speakers and printer. Each one comes alive. | The 6 parts and what each one does |
| 2. In, Think, Out | Types letters and watches each one travel from the keyboard, into the CPU box, out to the screen | Input, process, output, and how he does the same thing when he catches a ball |
| 3. Inside the Box | Opens the CPU box and explores the inside | CPU chip, RAM, hard disk, fan, power supply, motherboard |
| 4. Super-Fast Brain | Races the computer to count to 20 | A CPU does about 300 crore sums a second, but people have the ideas |
| 5. Desk and Cupboard | Makes a sticker picture, saves it, switches the power off and on, then opens it again | RAM forgets when the power goes off; the hard disk remembers |
| 6. Lights On, Lights Off | Flips a switch and sees every letter as 8 lights | Computers only understand ON (1) and OFF (0), shown with his own name |
| 7. Give the Orders | Uses arrow steps to guide a robot past rocks to a star | A program is a list of steps the computer follows exactly |
| 8. Big Quiz | Answers 8 picture questions | Goes over everything |

He wins a star for each level, and gets a certificate after all 8.

## Things to know

- **Bit the robot** reads every message out loud. Use **Read to me** to turn the voice on or off, and **Sounds** for the beeps.
- Colours always mean the same job: blue = IN, orange = THINK, green = OUT, yellow = STORE.
- Stars are saved in the browser. **Play again from the start** (at the bottom of the map) clears them.
- Works with a mouse, a touch screen or the keyboard (letters in Levels 2 and 6, space bar in Level 4, arrow keys and Enter in Level 7).

---

# Ayansh's Space Adventure

An animated, hands-on solar system in `solar-system/`. Nova, a friendly space guide, talks Ayansh through it in a recorded, natural-sounding voice, and every word she says is shown underneath so he can read along.

**To play:** keep the whole `solar-system` folder together (the voice lives in `solar-system/audio`) and open `solar-system/index.html` in a web browser. Press **Blast off!** to start. It works offline; the internet is only needed for the nicer fonts.

## The six activities

| Tab | What Ayansh does | What he learns |
|---|---|---|
| Explore | Watches the planets go round the Sun, taps any of them (or the comet or asteroid belt) to fly in close, or presses **Planet tour** | Each world's size, day, year, moons and a fun fact with a real-world comparison, plus a trick for remembering the order |
| How big? | Slides along all the planets drawn at their true sizes next to the edge of the Sun | If Earth were a grape, Jupiter would be a watermelon and the Sun taller than a door |
| Weigh me | Sets his weight and age, picks a world, presses **Jump!** | Gravity: light on the Moon, heavy on Jupiter, and how old he would be in that world's years |
| Day & Night | Spins Earth and watches his home in India move into sunshine or night; then drags the Moon around Earth | Why we have day and night, and why the Moon changes shape |
| Space race | Races a car, a rocket and a beam of light to the Moon, Mars, the Sun, Jupiter or Neptune | How far away space really is |
| Quiz | Answers 10 picture questions out loud | Goes over everything, with a star for each first-try answer |

## Things to know

- Planets are painted live from their own maps, so they really turn, the side facing the Sun is lit, and Earth shows the real continents.
- **Voice** turns Nova on or off, **Sounds** controls the beeps. The two buttons beside her words replay or stop what she is saying.
- If a voice file is missing, Nova falls back to the best-sounding voice the browser has.
- Distances in the Explore view are squeezed so everything fits on one screen; **How big?** shows the true sizes.

## Changing what Nova says

Her lines are in `solar-system/lines.js`. After editing them, re-record the voice with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx), a free text-to-speech model that runs on your own computer:

```bash
pip install kokoro-onnx soundfile
```

Download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the [model files release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0) into one folder, then run (ffmpeg is needed for the mp3 files):

```bash
python tools/make_voice.py --models /path/to/that/folder
```

Only changed lines are recorded again.
