import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DriverOption } from '../entities/reservation.entity';
import type { CategoryDetailKey } from '../entities/category-details.entity';

// The union of every category's detail fields. Which ones apply — and which are
// mandatory — depends on the product's category, so shape validation happens
// here and the per-category required check happens in the service against
// REQUIRED_DETAIL_FIELDS below.
//
// The ValidationPipe whitelists these, so a field belonging to another category
// is simply dropped rather than written to the wrong table.
export class CategoryDetailsDto {
  // ── Vehicles ──
  @IsOptional()
  @IsString()
  driverOption?: DriverOption;

  // ── Events & Party / Audio & Video ──
  @IsOptional()
  @IsString()
  @Length(0, 200)
  venue?: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  eventType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  guestCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  setupNeeded?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Setup time must be in HH:MM format.',
  })
  setupTime?: string;

  @IsOptional()
  @IsBoolean()
  isOutdoor?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  audienceSize?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  powerSource?: string;

  @IsOptional()
  @IsBoolean()
  operatorNeeded?: boolean;

  // ── Photography ──
  @IsOptional()
  @IsString()
  @Length(0, 60)
  shootType?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  shootLocation?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  accessories?: string;

  // ── Tools & Equipment ──
  @IsOptional()
  @IsString()
  @Length(0, 200)
  siteAddress?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  jobDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  shiftHoursPerDay?: number;

  // ── Sports & Outdoor ──
  @IsOptional()
  @IsString()
  @Length(0, 60)
  activity?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  destination?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  participantCount?: number;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  sizeNotes?: string;

  // ── Property & Spaces ──
  @IsOptional()
  @IsString()
  @Length(0, 60)
  useType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  occupantCount?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Check-in time must be in HH:MM format.',
  })
  checkInTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Check-out time must be in HH:MM format.',
  })
  checkOutTime?: string;

  @IsOptional()
  @IsBoolean()
  overnightStay?: boolean;

  // ── Other ──
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  useDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  headcount?: number;
}

// Fields the renter must answer, per category. Anything not listed is optional.
// Kept beside the DTO so the rule lives next to the shape it validates.
export const REQUIRED_DETAIL_FIELDS: Record<
  CategoryDetailKey,
  { field: keyof CategoryDetailsDto; message: string }[]
> = {
  vehicle: [
    {
      field: 'driverOption',
      message: 'Choose whether you will self drive or need a driver.',
    },
  ],
  event: [
    { field: 'eventType', message: 'What kind of event is this for?' },
    { field: 'venue', message: 'Where is the event being held?' },
    { field: 'guestCount', message: 'How many guests are you expecting?' },
  ],
  audio: [
    { field: 'venue', message: 'Where will the equipment be used?' },
    { field: 'audienceSize', message: 'Roughly how big is the audience?' },
    { field: 'powerSource', message: 'What power is available on site?' },
  ],
  photo: [
    { field: 'shootType', message: 'What kind of shoot is this for?' },
    { field: 'shootLocation', message: 'Where will you be shooting?' },
    { field: 'experienceLevel', message: 'How experienced are you with this gear?' },
  ],
  tool: [
    { field: 'siteAddress', message: 'Where will the equipment be used?' },
    { field: 'jobDescription', message: 'Briefly describe the job.' },
  ],
  sport: [
    { field: 'activity', message: 'What activity is this for?' },
    { field: 'participantCount', message: 'How many people are joining?' },
  ],
  space: [
    { field: 'useType', message: 'What will you use the space for?' },
    { field: 'occupantCount', message: 'How many people will be there?' },
  ],
  other: [
    { field: 'useDescription', message: 'Briefly describe what you need it for.' },
  ],
};
