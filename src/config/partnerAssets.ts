import { ImageSourcePropType } from 'react-native';
import { PartnerPose, PartnerType } from '../types';

export const PARTNER_POSES: PartnerPose[] = [
  'gentle', 'idle', 'intro', 'praise', 'speak', 'triumph',
];

export const PARTNER_IMAGE_SOURCES: Record<PartnerType, Record<PartnerPose, ImageSourcePropType>> = {
  teacher: {
    gentle: require('../../assets/partners/partner_teacher_gentle.png'),
    idle: require('../../assets/partners/partner_teacher_idle.png'),
    intro: require('../../assets/partners/partner_teacher_intro.png'),
    praise: require('../../assets/partners/partner_teacher_praise.png'),
    speak: require('../../assets/partners/partner_teacher_speak.png'),
    triumph: require('../../assets/partners/partner_teacher_triumph.png'),
  },
  counselor: {
    gentle: require('../../assets/partners/partner_counselor_gentle.png'),
    idle: require('../../assets/partners/partner_counselor_idle.png'),
    intro: require('../../assets/partners/partner_counselor_intro.png'),
    praise: require('../../assets/partners/partner_counselor_praise.png'),
    speak: require('../../assets/partners/partner_counselor_speak.png'),
    triumph: require('../../assets/partners/partner_counselor_triumph.png'),
  },
  scientist: {
    gentle: require('../../assets/partners/partner_scientist_gentle.png'),
    idle: require('../../assets/partners/partner_scientist_idle.png'),
    intro: require('../../assets/partners/partner_scientist_intro.png'),
    praise: require('../../assets/partners/partner_scientist_praise.png'),
    speak: require('../../assets/partners/partner_scientist_speak.png'),
    triumph: require('../../assets/partners/partner_scientist_triumph.png'),
  },
  trainer: {
    gentle: require('../../assets/partners/partner_trainer_gentle.png'),
    idle: require('../../assets/partners/partner_trainer_idle.png'),
    intro: require('../../assets/partners/partner_trainer_intro.png'),
    praise: require('../../assets/partners/partner_trainer_praise.png'),
    speak: require('../../assets/partners/partner_trainer_speak.png'),
    triumph: require('../../assets/partners/partner_trainer_triumph.png'),
  },
};

export const PARTNER_IMAGES_FEEDBACK_FULLBODY: Record<PartnerType, ImageSourcePropType> = {
  teacher: require('../../assets/partners/partner_teacher_praiseFullbody.png'),
  counselor: require('../../assets/partners/partner_counselor_praiseFullbody.png'),
  scientist: require('../../assets/partners/partner_scientist_praiseFullbody.png'),
  trainer: require('../../assets/partners/partner_trainer_praiseFullbody.png'),
};

/** expo-asset 用：24枚 + 完了画面用全身4枚 */
export const ALL_PARTNER_IMAGE_MODULES: ImageSourcePropType[] = (
  (Object.keys(PARTNER_IMAGE_SOURCES) as PartnerType[]).flatMap((t) =>
    PARTNER_POSES.map((p) => PARTNER_IMAGE_SOURCES[t][p]),
  )
).concat(
  (Object.keys(PARTNER_IMAGES_FEEDBACK_FULLBODY) as PartnerType[]).map(
    (t) => PARTNER_IMAGES_FEEDBACK_FULLBODY[t],
  ),
);
