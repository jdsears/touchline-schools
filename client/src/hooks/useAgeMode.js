import { usePupilProfile } from './usePupilProfile'

/**
 * Age-mode inference from year group.
 *
 * Returns a mode string and derived feature flags:
 *
 *   Young (Y2-Y6):
 *     - Larger text, simpler language, no self-reflection
 *     - Simplified assessment (faces not grades)
 *
 *   Standard (Y7-Y10):
 *     - Full features, IDP with self-reflection
 *     - House identity prominent
 *
 *   Mature (Y11-Y13):
 *     - Information-dense, GCSE/A-Level workflows
 *     - Detailed self-reflection, leadership features
 */
export function useAgeMode() {
  const { pupil, loading } = usePupilProfile()

  if (loading || !pupil) {
    return {
      mode: 'standard',
      loading: true,
      showSelfReflection: false,
      showGCSEEvidence: false,
      showLeadershipFeatures: false,
      useFaceAssessment: false,
      textSizeClass: 'text-sm',
      headingSizeClass: 'text-xl',
    }
  }

  const yearGroup = parseInt(pupil.year_group, 10) || 8
  const isGCSE = pupil.gcse_pe_candidate === true

  if (yearGroup <= 6) {
    return {
      mode: 'young',
      loading: false,
      showSelfReflection: false,
      showGCSEEvidence: false,
      showLeadershipFeatures: false,
      useFaceAssessment: true,
      textSizeClass: 'text-base',
      headingSizeClass: 'text-2xl',
    }
  }

  if (yearGroup >= 11) {
    return {
      mode: 'mature',
      loading: false,
      showSelfReflection: true,
      showGCSEEvidence: isGCSE,
      showLeadershipFeatures: true,
      useFaceAssessment: false,
      textSizeClass: 'text-sm',
      headingSizeClass: 'text-xl',
    }
  }

  // Y7-Y10
  return {
    mode: 'standard',
    loading: false,
    showSelfReflection: true,
    showGCSEEvidence: false,
    showLeadershipFeatures: false,
    useFaceAssessment: false,
    textSizeClass: 'text-sm',
    headingSizeClass: 'text-xl',
  }
}
