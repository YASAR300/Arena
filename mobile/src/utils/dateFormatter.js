/**
 * Formats a date/timestamp into separate date and time strings
 * matching the exact format in Objective_Page.png:
 * Date: "10 Aug 26"
 * Time: "11:50 PM"
 */
export const formatCompetitionDate = (isoString) => {
  if (!isoString) {
    return { date: '--', time: '--' };
  }

  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) {
    return { date: '--', time: '--' };
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
  ];

  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = String(dateObj.getFullYear()).slice(-2);

  // Time in 12-hour format with AM/PM
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return {
    date: `${day} ${month} ${year}`,
    time: `${formattedHours}:${minutes} ${ampm}`,
  };
};

export default formatCompetitionDate;
