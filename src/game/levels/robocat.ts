import level from '../../../assets/levels/robocat/level.json';
import previewSource from '../../../assets/levels/robocat/preview.png';

import board000 from '../../../assets/levels/robocat/boards/000.json';
import board001 from '../../../assets/levels/robocat/boards/001.json';
import board002 from '../../../assets/levels/robocat/boards/002.json';
import board003 from '../../../assets/levels/robocat/boards/003.json';
import board004 from '../../../assets/levels/robocat/boards/004.json';
import board005 from '../../../assets/levels/robocat/boards/005.json';
import board006 from '../../../assets/levels/robocat/boards/006.json';
import board007 from '../../../assets/levels/robocat/boards/007.json';
import board008 from '../../../assets/levels/robocat/boards/008.json';
import board009 from '../../../assets/levels/robocat/boards/009.json';
import board010 from '../../../assets/levels/robocat/boards/010.json';
import board011 from '../../../assets/levels/robocat/boards/011.json';
import board012 from '../../../assets/levels/robocat/boards/012.json';
import board013 from '../../../assets/levels/robocat/boards/013.json';
import board014 from '../../../assets/levels/robocat/boards/014.json';
import board015 from '../../../assets/levels/robocat/boards/015.json';
import board016 from '../../../assets/levels/robocat/boards/016.json';
import board017 from '../../../assets/levels/robocat/boards/017.json';
import board018 from '../../../assets/levels/robocat/boards/018.json';
import board019 from '../../../assets/levels/robocat/boards/019.json';
import board020 from '../../../assets/levels/robocat/boards/020.json';
import board021 from '../../../assets/levels/robocat/boards/021.json';
import board022 from '../../../assets/levels/robocat/boards/022.json';
import board023 from '../../../assets/levels/robocat/boards/023.json';
import board024 from '../../../assets/levels/robocat/boards/024.json';
import board025 from '../../../assets/levels/robocat/boards/025.json';
import board026 from '../../../assets/levels/robocat/boards/026.json';
import board027 from '../../../assets/levels/robocat/boards/027.json';
import board028 from '../../../assets/levels/robocat/boards/028.json';
import board029 from '../../../assets/levels/robocat/boards/029.json';
import board030 from '../../../assets/levels/robocat/boards/030.json';
import board031 from '../../../assets/levels/robocat/boards/031.json';
import board032 from '../../../assets/levels/robocat/boards/032.json';
import board033 from '../../../assets/levels/robocat/boards/033.json';
import board034 from '../../../assets/levels/robocat/boards/034.json';
import board035 from '../../../assets/levels/robocat/boards/035.json';
import board036 from '../../../assets/levels/robocat/boards/036.json';
import board037 from '../../../assets/levels/robocat/boards/037.json';
import board038 from '../../../assets/levels/robocat/boards/038.json';
import board039 from '../../../assets/levels/robocat/boards/039.json';
import board040 from '../../../assets/levels/robocat/boards/040.json';
import board041 from '../../../assets/levels/robocat/boards/041.json';
import board042 from '../../../assets/levels/robocat/boards/042.json';
import board043 from '../../../assets/levels/robocat/boards/043.json';
import board044 from '../../../assets/levels/robocat/boards/044.json';
import board045 from '../../../assets/levels/robocat/boards/045.json';
import board046 from '../../../assets/levels/robocat/boards/046.json';
import board047 from '../../../assets/levels/robocat/boards/047.json';

import { buildPreparedLevel } from './preparedLevel';

const boards = [
  board000, board001, board002, board003, board004, board005, board006, board007,
  board008, board009, board010, board011, board012, board013, board014, board015,
  board016, board017, board018, board019, board020, board021, board022, board023,
  board024, board025, board026, board027, board028, board029, board030, board031,
  board032, board033, board034, board035, board036, board037, board038, board039,
  board040, board041, board042, board043, board044, board045, board046, board047,
];

const robocat = buildPreparedLevel(level, previewSource, boards);

export default robocat;
