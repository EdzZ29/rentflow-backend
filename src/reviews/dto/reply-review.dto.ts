import { IsString, Length } from 'class-validator';

export class ReplyReviewDto {
  @IsString()
  @Length(1, 2000)
  reply: string;
}
