export type VideoMeetingStatus = 'pending' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'rejected';
export type ParticipantStatus = 'invited' | 'present' | 'absent';
export type ParticipantRole = 'moderator' | 'participant';

export interface VideoMeeting {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  status: VideoMeetingStatus;
  room_url?: string;
  room_name?: string;
  is_recording_enabled: boolean;
  recording_url?: string;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface VideoMeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  tenant_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at?: string;
  left_at?: string;
  invited_at: string;
}

export interface VideoMeetingMessage {
  id: string;
  meeting_id: string;
  user_id: string;
  tenant_id: string;
  content: string;
  created_at: string;
}

export interface CreateVideoMeetingData {
  title: string;
  description?: string;
  scheduled_at?: string;
  status?: VideoMeetingStatus;
  is_recording_enabled?: boolean;
  participants?: string[]; // user_ids
}
