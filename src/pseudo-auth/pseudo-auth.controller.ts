import { Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/system/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@ApiTags('Pseudo Auth')
@Controller('pseudo-auth')
export class PseudoAuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}
  @Post('register')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
        },
        accessToken: {
          type: 'string',
        },
      },
    },
    description: 'The access token',
  })
  async register() {
    return this.createStudentAndAccessToken();
  }

  async createStudentAndAccessToken() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const studentId = uuidv4();
    await this.prismaService.student.create({
      data: {
        id: studentId,
      },
    });

    const accessToken = jwt.sign({ studentId }, jwtSecret);

    return {
      studentId,
      accessToken,
    };
  }
}
