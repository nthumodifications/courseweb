export type GradeObject = {
  student: {
    studentid: string;
    name_zh: string;
    class_name_zh: string;
  };
  credits: {
    total_credits: number;
    passed_credits: number;
    pending_credits: number;
  };
  grades: {
    raw_id: string;
    year: string;
    semester: string;
    course_id: string;
    name_zh: string;
    name_en: string;
    credits: number;
    grade: string;
    ge_type: string;
    ge_description: string;
    ranking: string;
    t_scores: string;
  }[];
  ranking: {
    data: {
      year: string;
      semester: string;
      gpa: string;
      t_score_avg: string;
      relative_avg: string;
      credits: number;
      actual_credits: number;
      num_of_courses: number;
      summer_credits: number;
      transfer_credits: number;
      letter_class_rank: string;
      letter_dept_rank: string;
      t_score_class_rank: string;
      t_score_dept_rank: string;
      relative_class_rank: string;
      relative_dept_rank: string;
      comments: string;
    }[];
    cumulative: {
      letter: {
        gpa_cum_year_tw: string;
        letter_cum_dept_rank: string;
        letter_cum_class_rank: string;
        gpa: string;
      };
      relative: {
        gpa_cum_year_tw: string;
        relative_cum_dept_rank: string;
        relative_cum_class_rank: string;
        relative_cum: string;
      };
      t_scores: {
        gpa_cum_year_tw: string;
        t_scores_cum_dept_rank: string;
        t_scores_cum_class_rank: string;
        t_scores_cum: string;
      };
    };
  };
};
