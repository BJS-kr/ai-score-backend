import { Injectable } from '@nestjs/common';
import { ScoreRepository } from 'src/score/IO/respositories/score.respository';

@Injectable()
export class SubmissionsQueryService {
  constructor(private readonly scoreRepository: ScoreRepository) {}
}
