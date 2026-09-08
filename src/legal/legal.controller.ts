import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  LEGAL_BY_SLUG,
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_VERSION,
} from './legal.content';

// Public by necessity: these have to be readable before anyone has an account,
// since registration asks you to agree to them.
@Public()
@Controller('legal')
export class LegalController {
  // The index, without section bodies — enough to build a menu.
  @Get()
  list() {
    return {
      version: LEGAL_VERSION,
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      documents: LEGAL_DOCUMENTS.map(({ slug, title, summary }) => ({
        slug,
        title,
        summary,
      })),
    };
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    const document = LEGAL_BY_SLUG[slug];
    if (!document) {
      throw new NotFoundException(`No legal document named "${slug}".`);
    }
    return document;
  }
}
