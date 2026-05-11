import { join } from 'node:path';
import { faker } from '@faker-js/faker';
import { generateRandomThaiId, loadCsv, randOf, randomBirthDate } from '../../helper/index.js';

function loadCodes(dataDir) {
  const base = join(dataDir, 'demographic');
  const pickCodes = (file) =>
    loadCsv(join(base, file))
      .filter((r) => r.active)
      .map((r) => String(r.code));

  return {
    nationalities: pickCodes('nationality.csv'),
    maritalStatuses: pickCodes('marital-status.csv'),
    races: pickCodes('race.csv'),
    religions: pickCodes('religion.csv'),
    occupations: pickCodes('occupation.csv'),
    educationLevels: pickCodes('education-level.csv'),
    languages: pickCodes('language.csv'),
    thaiAddresses: loadCsv(join(base, 'thai_address.csv')).filter((r) => r.active),
  };
}

export async function generateRandomPatient(dataDir) {
  const { nationalities, maritalStatuses, races, religions, occupations, educationLevels, languages, thaiAddresses } =
    loadCodes(dataDir);

  const gender = Math.random() < 0.5 ? 'male' : 'female';
  const namePrefixCode = gender === 'male' ? '003' : '004';

  const firstName = faker.person.firstName(gender);
  const familyName = faker.person.lastName();

  const thaiAddr = randOf(thaiAddresses);
  const code = String(thaiAddr.code).padStart(6, '0');
  const stateCode = code.substring(0, 2);
  const districtCode = code.substring(0, 4);
  const cityCode = code.substring(0, 6);

  const streetNum = Math.floor(Math.random() * 200) + 1;
  const line = `${streetNum}/${Math.floor(Math.random() * 200) + 1}`;

  const abo = randOf(['A', 'B', 'AB', 'O']);
  const rh = randOf(['positive', 'negative']);

  return {
    mode: 'cid',
    idCardNo: generateRandomThaiId(),
    gender,
    namePrefixCode: { code: namePrefixCode },
    nationalityCode: randOf(nationalities),
    maritalStatusCode: randOf(maritalStatuses),
    birthDate: randomBirthDate(),
    raceCode: randOf(races),
    religionCode: { code: randOf(religions) },
    occupationCode: { code: randOf(occupations) },
    categoryCode: { code: 'general' },
    educationLevelCode: randOf(educationLevels),
    aboBloodGroup: abo,
    rhBloodGroup: rh,
    officialAddress: {
      line,
      stateCode,
      districtCode,
      cityCode,
      postalCode: String(thaiAddr.postal_code),
    },
    currentAddress: {
      line,
      stateCode,
      districtCode,
      cityCode,
      postalCode: String(thaiAddr.postal_code),
    },
    informationGiverContact: {
      categoryCode: '1',
    },
    firstName,
    familyName,
    deceased: false,
    primaryLanguage: randOf(languages),
  };
}
