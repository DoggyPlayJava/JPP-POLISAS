import { getSemesterInfo } from '@/types';

type StudentSemesterProfile = {
  intake_year: number | null;
  intake_period: number | null;
  programme_code: string | null;
  semester_override: number | null;
};

export function getStudentSemesterInfo(
  profile: StudentSemesterProfile,
  intake1Month: number,
  intake2Month: number,
) {
  if (!profile.intake_year || ![1, 2].includes(profile.intake_period ?? 0)) return null;
  return getSemesterInfo(
    profile.intake_year,
    profile.intake_period as 1 | 2,
    profile.programme_code === 'FTV',
    intake1Month,
    intake2Month,
    profile.semester_override,
  );
}
