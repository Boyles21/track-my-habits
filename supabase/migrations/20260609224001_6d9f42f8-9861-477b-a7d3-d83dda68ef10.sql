
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- (No general INSERT policy — triggers run as SECURITY DEFINER)

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID, _type TEXT, _title TEXT, _body TEXT DEFAULT NULL, _link TEXT DEFAULT NULL, _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (_user_id, _type, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Trigger: logbook entry status changes
CREATE OR REPLACE FUNCTION public.notify_logbook_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _link TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _link := '/logbook';
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(
        NEW.student_id, 'entry_approved',
        'Logbook entry approved',
        'Your entry for ' || to_char(NEW.entry_date, 'Mon DD, YYYY') || ' has been approved.',
        _link, jsonb_build_object('entry_id', NEW.id)
      );
    ELSIF NEW.status = 'revision_needed' THEN
      PERFORM public.create_notification(
        NEW.student_id, 'entry_revision',
        'Revision requested',
        'Your supervisor requested changes on your ' || to_char(NEW.entry_date, 'Mon DD, YYYY') || ' entry.',
        _link, jsonb_build_object('entry_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_logbook_status_change
AFTER UPDATE ON public.logbook_entries
FOR EACH ROW EXECUTE FUNCTION public.notify_logbook_status_change();

-- Trigger: new logbook entry → notify supervisor
CREATE OR REPLACE FUNCTION public.notify_supervisor_new_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sup UUID; _student_name TEXT;
BEGIN
  SELECT supervisor_id INTO _sup FROM public.supervisor_students WHERE student_id = NEW.student_id;
  IF _sup IS NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
  PERFORM public.create_notification(
    _sup, 'entry_submitted',
    'New logbook entry to review',
    COALESCE(_student_name, 'A student') || ' submitted an entry for ' || to_char(NEW.entry_date, 'Mon DD, YYYY') || '.',
    '/reviews', jsonb_build_object('entry_id', NEW.id, 'student_id', NEW.student_id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_supervisor_new_entry
AFTER INSERT ON public.logbook_entries
FOR EACH ROW EXECUTE FUNCTION public.notify_supervisor_new_entry();

-- Trigger: supervisor assignment → notify both parties
CREATE OR REPLACE FUNCTION public.notify_supervisor_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student_name TEXT; _sup_name TEXT;
BEGIN
  SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
  SELECT full_name INTO _sup_name FROM public.profiles WHERE id = NEW.supervisor_id;
  PERFORM public.create_notification(
    NEW.student_id, 'supervisor_assigned',
    'Supervisor assigned',
    'You have been assigned to supervisor ' || COALESCE(_sup_name, '') || '.',
    '/dashboard', jsonb_build_object('supervisor_id', NEW.supervisor_id)
  );
  PERFORM public.create_notification(
    NEW.supervisor_id, 'student_assigned',
    'New student assigned',
    COALESCE(_student_name, 'A new student') || ' has been assigned to you.',
    '/students', jsonb_build_object('student_id', NEW.student_id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_supervisor_assignment
AFTER INSERT ON public.supervisor_students
FOR EACH ROW EXECUTE FUNCTION public.notify_supervisor_assignment();

-- Trigger: reassignment → notify student + new supervisor
CREATE OR REPLACE FUNCTION public.notify_supervisor_reassignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student_name TEXT; _sup_name TEXT;
BEGIN
  IF NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id THEN
    SELECT full_name INTO _student_name FROM public.profiles WHERE id = NEW.student_id;
    SELECT full_name INTO _sup_name FROM public.profiles WHERE id = NEW.supervisor_id;
    PERFORM public.create_notification(
      NEW.student_id, 'supervisor_reassigned',
      'Supervisor reassigned',
      'Your supervisor has been updated to ' || COALESCE(_sup_name, '') || '.',
      '/dashboard', jsonb_build_object('supervisor_id', NEW.supervisor_id)
    );
    PERFORM public.create_notification(
      NEW.supervisor_id, 'student_assigned',
      'New student assigned',
      COALESCE(_student_name, 'A student') || ' has been reassigned to you.',
      '/students', jsonb_build_object('student_id', NEW.student_id)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_supervisor_reassignment
AFTER UPDATE ON public.supervisor_students
FOR EACH ROW EXECUTE FUNCTION public.notify_supervisor_reassignment();

-- Trigger: new comment on a logbook entry → notify the student (if commenter isn't them)
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student_id UUID;
BEGIN
  SELECT student_id INTO _student_id FROM public.logbook_entries WHERE id = NEW.entry_id;
  IF _student_id IS NULL OR _student_id = NEW.supervisor_id THEN RETURN NEW; END IF;
  PERFORM public.create_notification(
    _student_id, 'new_comment',
    'New comment on your entry',
    'Your supervisor left a comment on one of your entries.',
    '/logbook', jsonb_build_object('entry_id', NEW.entry_id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();
