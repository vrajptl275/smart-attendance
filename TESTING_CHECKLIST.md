# Smart Attendance System - Testing Checklist

## Feature 1: Teacher Management Restructuring

### Backend API Testing

#### Teacher Management Endpoints
- [ ] **GET /api/admin/teachers** - Returns all teachers (not filtered by class)
- [ ] **POST /api/admin/teachers** - Creates teacher with name, email, password only
- [ ] **PUT /api/admin/teachers/{id}** - Updates teacher name, email, password only
- [ ] **DELETE /api/admin/teachers/{id}** - Prevents deletion if assigned to subjects

#### Subject Management with Teacher Assignment
- [ ] **GET /api/admin/classes/{id}/subjects** - Returns subjects with teacher info + all teachers
- [ ] **POST /api/admin/classes/{id}/subjects** - Requires teacher_id in request body
- [ ] **PUT /api/admin/subjects/{id}** - Allows reassigning teacher to subject
- [ ] **DELETE /api/admin/subjects/{id}** - Removes teacher assignment

#### Teacher Profile Updates
- [ ] **GET /api/teacher/profile** - Shows all assigned subjects across all classes
- [ ] **GET /api/teacher/classes-subjects** - Filters by teacher assignments only

### Frontend Testing

#### Admin Dashboard
- [ ] Sidebar has 3 menu items: Dashboard, Teachers, Manage Classes
- [ ] Teachers menu loads all teachers in card format
- [ ] Add Teacher form has only 3 fields (name, email, password)
- [ ] Edit Teacher form updates name, email, password only
- [ ] Delete Teacher shows error if assigned to subjects with subject list
- [ ] Teacher email validation prevents duplicates

#### Class Management
- [ ] Teachers tab is removed from class management
- [ ] Only 2 tabs remain: Subjects and Students
- [ ] Add Subject form includes teacher dropdown (required)
- [ ] Teacher dropdown shows format: "Name (email@domain.com)"
- [ ] Edit Subject allows reassigning teacher
- [ ] Subject list shows assigned teacher info

#### Teacher Portal
- [ ] Profile shows subjects in format: "Class: Subject (Code)"
- [ ] Start Session dropdown 1 shows only classes where teacher has subjects
- [ ] Start Session dropdown 2 shows only assigned subjects in selected class
- [ ] Reports dropdown filtering works the same way

### Database Validation
- [ ] teacher_subjects table has one-to-one relationship (subject -> teacher)
- [ ] Same teacher can be assigned to multiple subjects in same class
- [ ] Same teacher can teach same subject in different classes
- [ ] One subject in one class has exactly ONE teacher
- [ ] Foreign key constraints prevent orphaned records

## Feature 2: Blink Detection for Attendance

### Backend Testing
- [ ] **POST /api/student/mark-attendance** - Still works with image data
- [ ] Face verification returns clear error messages for each failure case
- [ ] Attendance marking prevents duplicates
- [ ] Session expiration is properly validated

### Frontend Testing

#### Blink Detection Flow
- [ ] Enter code → Verify → Camera opens automatically
- [ ] Manual "Mark Attendance" button is completely removed
- [ ] Blink counter displays: ○○○ (0/3) initially
- [ ] Real-time feedback shows: "Position your face in the oval"
- [ ] Face detection shows: "Face detected ✓"

#### Blink Detection Logic
- [ ] First blink: ●○○ (1/3) + "Blink 1 detected!"
- [ ] Second blink: ●●○ (2/3) + "Blink 2 detected!"
- [ ] Third blink: ●●● (3/3) + "Blink 3 detected! Processing..."
- [ ] Auto-capture after 3rd blink
- [ ] Face verification still required after blinks

#### Error Handling
- [ ] Face verification failed: Reset counter, allow retry
- [ ] Already marked: Stop camera, show error, return to code input
- [ ] Session expired: Stop camera, show error, return to code input
- [ ] Multiple faces: Reset counter, show error message
- [ ] No face detected: Show "Position your face" message
- [ ] Timeout (5 seconds no blink): Reset counter if count > 0

#### Fallback Mechanism
- [ ] Manual capture button hidden by default
- [ ] Appears after 3 failed attempts
- [ ] "Having trouble? Click here to capture manually"
- [ ] Manual capture uses same verification process

#### UI/UX Elements
- [ ] Blink counter is large and prominent
- [ ] Visual feedback updates in real-time
- [ ] Instruction text: "👁️ Blink 3 times to mark attendance"
- [ ] Face oval overlay for positioning guidance
- [ ] Feedback messages with appropriate icons
- [ ] Optional sound feedback on blink detection
- [ ] Smooth animations for blink detection

### Edge Cases Testing

#### Lighting Conditions
- [ ] Works in normal lighting
- [ ] Handles low light conditions
- [ ] Shows warning for insufficient lighting

#### Face Position
- [ ] Face must be within oval overlay
- [ ] Shows guidance for face too far/close
- [ ] Handles face movement during detection

#### Performance
- [ ] Runs at 30 FPS on normal devices
- [ ] Reduces to 15 FPS on slow devices
- [ ] Shows loading indicator if processing > 2 seconds

#### Multiple Faces
- [ ] Resets counter immediately if multiple faces detected
- [ ] Shows clear error message
- [ ] Resumes detection when single face

## Security Testing

### Feature 1 Security
- [ ] Teacher email uniqueness enforced
- [ ] Cannot delete teacher with active assignments
- [ ] Subject must have teacher assigned (required validation)
- [ ] Authorization checks for admin-only endpoints
- [ ] Teacher sees only their assigned classes/subjects

### Feature 2 Security
- [ ] Blink detection AND face matching both required
- [ ] Cannot bypass face verification with just blinks
- [ ] Session validation still enforced
- [ ] Image data properly validated
- [ ] No client-side security bypasses

## Integration Testing

### Feature 1 Integration
- [ ] Admin creates teacher → Teacher can login
- [ ] Admin assigns teacher to subject → Teacher sees in profile
- [ ] Admin removes teacher assignment → Teacher loses access
- [ ] Teacher starts session → Only assigned subjects available
- [ ] Student marks attendance → Works with new teacher assignments

### Feature 2 Integration
- [ ] Student registers face → Blink detection works
- [ ] Teacher starts session → Student can use blink detection
- [ ] Blink detection → Face verification → Attendance marked
- [ ] Failed verification → Can retry with blinks
- [ ] Manual fallback → Same verification process

## Performance Testing

### Load Testing
- [ ] Multiple teachers creating subjects simultaneously
- [ ] Multiple students using blink detection simultaneously
- [ ] Database performance with teacher-subject assignments
- [ ] Camera performance with continuous frame processing

### Browser Compatibility
- [ ] Chrome (desktop/mobile)
- [ ] Firefox (desktop/mobile)
- [ ] Safari (desktop/mobile)
- [ ] Edge (desktop)

## User Experience Testing

### Admin Workflow
- [ ] Intuitive teacher management flow
- [ ] Clear error messages for validation failures
- [ ] Smooth navigation between sections
- [ ] Responsive design on all devices

### Teacher Workflow
- [ ] Clear profile display of assignments
- [ ] Easy session creation with filtered dropdowns
- [ ] Consistent experience with existing features

### Student Workflow
- [ ] Intuitive blink detection process
- [ ] Clear visual feedback throughout
- [ ] Fallback option when needed
- [ ] Smooth error recovery

## Regression Testing

### Existing Features
- [ ] Login system still works for all roles
- [ ] Student face registration unchanged
- [ ] Teacher session management unchanged (except filtering)
- [ ] Admin dashboard statistics accurate
- [ ] Student attendance reports unchanged
- [ ] All existing CSS/styling preserved

### Data Integrity
- [ ] Existing teacher assignments preserved during migration
- [ ] Student records unchanged
- [ ] Class and subject data intact
- [ ] Attendance history preserved

## Deployment Testing

### Environment Setup
- [ ] Database migrations run successfully
- [ ] All new endpoints accessible
- [ ] Static files (CSS/JS) updated
- [ ] No breaking changes in production

### Configuration
- [ ] Environment variables properly set
- [ ] Camera permissions work in production
- [ ] HTTPS required for camera access
- [ ] Performance acceptable under load

## Final Acceptance Criteria

### Feature 1 Complete
- [ ] Admin has 3 sidebar menus (Dashboard, Teachers, Manage Classes)
- [ ] Teachers managed independently with 3-field form
- [ ] Subjects tied to classes with required teacher assignment
- [ ] Clean separation of concerns between teacher and class management
- [ ] Teacher portal shows all assignments across classes

### Feature 2 Complete
- [ ] Students enter code, camera opens, blink 3 times
- [ ] Visual counter updates in real-time
- [ ] Automatic face capture and verification
- [ ] Success or retry based on face match
- [ ] No manual button needed (with fallback available)
- [ ] Maintains security with both blink + face verification

### Overall System
- [ ] No breaking changes to existing functionality
- [ ] All user roles work as expected
- [ ] Performance meets requirements
- [ ] Security standards maintained
- [ ] User experience improved
- [ ] Code is maintainable and well-documented