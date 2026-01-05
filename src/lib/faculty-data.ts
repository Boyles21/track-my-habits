// Faculty, Department, and Programme data for cascading dropdowns
export const facultyData: Record<string, Record<string, string[]>> = {
  Science: {
    Computing: ["B.Sc Computer Science"],
    Mathematics: ["B.Sc Mathematics"],
    Physics: ["B.Sc Physics"],
    Biology: ["B.Sc Biology"],
    Chemistry: ["B.Sc Chemistry"],
  },
  Arts: {
    History: ["B.A History"],
    English: ["B.A English"],
    Philosophy: ["B.A Philosophy"],
    Languages: ["B.A French", "B.A Hausa"],
    "Theatre Arts": ["B.A Theatre Arts"],
  },
  Engineering: {
    "Civil Engineering": ["B.Eng Civil Engineering"],
    "Mechanical Engineering": ["B.Eng Mechanical Engineering"],
    "Electrical Engineering": ["B.Eng Electrical Engineering"],
    "Computer Engineering": ["B.Eng Computer Engineering"],
    "Chemical Engineering": ["B.Eng Chemical Engineering"],
  },
  Management: {
    Accounting: ["B.Sc Accounting"],
    "Business Administration": ["B.Sc Business Administration"],
    Marketing: ["B.Sc Marketing"],
    "Human Resource Management": ["B.Sc HRM"],
    Economics: ["B.Sc Economics"],
  },
};

export const getFaculties = (): string[] => Object.keys(facultyData);

export const getDepartments = (faculty: string): string[] => {
  return faculty && facultyData[faculty] ? Object.keys(facultyData[faculty]) : [];
};

export const getProgrammes = (faculty: string, department: string): string[] => {
  return faculty && department && facultyData[faculty]?.[department]
    ? facultyData[faculty][department]
    : [];
};
