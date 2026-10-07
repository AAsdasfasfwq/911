// Set registry: name[:variant] -> factory
import { ManhattanSet } from './manhattan.js';
import { InfoSet } from './info.js';
import { GlobeSet } from './globe.js';
import { RoomsSet } from './rooms.js';
import { DesertSet, AfghanSet, CaveSet, CampSet, KabulSet, AbbottabadSet } from './places_mideast.js';
import { AirportSet, SkySet, PentagonSet, FieldSet, RanchSet, SuburbSet, FlightSchoolSet, DCSet, CarrierSet } from './places_us.js';
import { EuropeSet } from './places_world.js';

export function registerSets(film) {
  const reg = { nyc: ManhattanSet, info: InfoSet, globe: GlobeSet, rooms: RoomsSet, desert: DesertSet, afghan: AfghanSet, cave: CaveSet, camp: CampSet,
    kabul: KabulSet, abbottabad: AbbottabadSet, airport: AirportSet, sky: SkySet, pentagon: PentagonSet, field: FieldSet, ranch: RanchSet, suburb: SuburbSet,
    flightschool: FlightSchoolSet, dc: DCSet, carrier: CarrierSet, europe: EuropeSet };
  for (const k in reg) film.registerSet(k, (v) => new reg[k](v));
}
