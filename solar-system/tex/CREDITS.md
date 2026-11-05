# Where the planet pictures come from

The planet, Moon, Sun and star maps are built from NASA imagery (Blue Marble, Black Marble city lights, and spacecraft mosaics of the Moon, Mars, Jupiter, Saturn and the other worlds), taken from two open-source projects:

- [sanderblue/solar-system-threejs](https://github.com/sanderblue/solar-system-threejs) (Apache License 2.0)
- [SoumyaEXE/3d-Solar-System-ThreeJS](https://github.com/SoumyaEXE/3d-Solar-System-ThreeJS) (MIT License)

They were resized and saved as `.js` files by `tools/make_textures.py`, so the app also works when opened straight from a folder. Pluto's map was recoloured and given its heart-shaped plain, Tombaugh Regio. The India view is cut from the same Earth map.

The 3D engine is [three.js](https://threejs.org) r128 (MIT License, see `../vendor/three-LICENSE.txt`).

The Pangaea globe in Earth's story is made in the browser from the same NASA Earth day, shine and bump maps: each continent is cut out and rotated to an approximate position 250 million years ago (fitted by matching coastlines). It is a rough picture for children, not a scientific reconstruction.
